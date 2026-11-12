import { describe, expect, it } from "vitest";
import { flagFinding, parseExtraction } from "../src/shared/findings";
import { buildPatientContext } from "../src/worker/ai/context";
import { call, db, metaHeader, pdfBytes, signIn, userId } from "./helpers";

type Finding = { id: string; test: string; value: string; unit: string | null; refLow: number | null; refHigh: number | null; flag: string | null; confirmedByUser: boolean };

async function upload(cookie: string, body: string, title = "Lipid profile") {
  const res = await call("/api/v1/patients/me/reports", {
    cookie,
    raw: pdfBytes(body),
    headers: { "content-type": "application/pdf", "x-report-meta": metaHeader({ title, type: "Laboratory", reportDate: "2026-11-01" }) },
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { report: { id: string } }).report.id;
}
const consent = (cookie: string) => call("/api/v1/account/consents", { cookie, body: { kinds: ["ai_processing"] } });

describe("report values: rules", () => {
  it("flags a value against its printed range", () => {
    expect(flagFinding("162", null, 100)).toBe("high");
    expect(flagFinding("38", 40, null)).toBe("low");
    expect(flagFinding("13.5", 12, 16)).toBe("normal");
    expect(flagFinding("1,250", 150, 450)).toBe("high");
    expect(flagFinding("< 5", null, 10)).toBe("normal");
    expect(flagFinding("Negative", 0, 1)).toBeNull();
    expect(flagFinding("162", null, null)).toBeNull();
  });

  it("reads JSON out of a chatty reply and drops rows that aren't results", () => {
    const parsed = parseExtraction(
      'Sure! {"summary":" Lipid panel. ","findings":[{"test":"LDL","value":162,"unit":"mg/dL","refLow":null,"refHigh":"100"},{"test":"","value":"3"},{"test":"LDL","value":"162"},{"nope":1}]} Hope that helps',
    );
    expect(parsed).toEqual({ summary: "Lipid panel.", findings: [{ test: "LDL", value: "162", unit: "mg/dL", refLow: null, refHigh: 100 }] });
    expect(parseExtraction("I could not read this.")).toBeNull();
    expect(parseExtraction("{broken")).toBeNull();
  });
});

describe("report reader API", () => {
  it("reads values, flags them, and lets the patient correct one", async () => {
    const cookie = await signIn("reader-a@example.com", "198.51.100.130");
    await consent(cookie);
    const id = await upload(cookie, "LDL cholesterol: 162 mg/dL (0-100)\nHDL cholesterol: 38 mg/dL (40-60)\nHemoglobin: 13.5 g/dL (12-16)");

    const res = await call(`/api/v1/patients/me/reports/${id}/read`, { cookie, method: "POST" });
    expect(res.status).toBe(200);
    const read = (await res.json()) as { kind: string; summary: string; items: Finding[] };
    expect(read.kind).toBe("ok");
    expect(read.items.map((f) => [f.test, f.value, f.flag])).toEqual([
      ["LDL cholesterol", "162", "high"],
      ["HDL cholesterol", "38", "low"],
      ["Hemoglobin", "13.5", "normal"],
    ]);

    // The model misread LDL; the patient corrects it and the flag follows.
    const ldl = read.items[0]!;
    const fixed = await call(`/api/v1/patients/me/reports/findings/${ldl.id}`, { cookie, method: "PUT", body: { test: "LDL cholesterol", value: "92", unit: "mg/dL", refLow: 0, refHigh: 100 } });
    expect(fixed.status).toBe(200);
    expect(((await fixed.json()) as { finding: Finding }).finding).toMatchObject({ value: "92", flag: "normal", confirmedByUser: true });

    // Reading again keeps the corrected value.
    const again = (await (await call(`/api/v1/patients/me/reports/${id}/read`, { cookie, method: "POST" })).json()) as { items: Finding[] };
    expect(again.items.filter((f) => f.test === "LDL cholesterol").map((f) => f.value)).toEqual(["92"]);
    expect(again.items).toHaveLength(3);

    const reports = (await (await call("/api/v1/patients/me/reports", { cookie })).json()) as { items: { extractionStatus: string; summary: string }[] };
    expect(reports.items[0]).toMatchObject({ extractionStatus: "done", summary: "[test model] Lab report." });

    // The assistant now knows the out-of-range result.
    const ctx = await buildPatientContext(db, { userId: await userId(cookie) });
    expect(ctx.text).toMatch(/HDL cholesterol 38 mg\/dL \(below the report's range of 40-60\)/);
    expect(ctx.text).not.toMatch(/LDL cholesterol 92/);

    const del = await call(`/api/v1/patients/me/reports/findings/${again.items.find((f) => f.test === "Hemoglobin")!.id}`, { cookie, method: "DELETE" });
    expect(del.status).toBe(200);
    const left = (await (await call(`/api/v1/patients/me/reports/${id}/findings`, { cookie })).json()) as { items: Finding[] };
    expect(left.items).toHaveLength(2);
  });

  it("needs consent, costs nothing when it fails, and is private to the owner", async () => {
    const cookie = await signIn("reader-b@example.com", "198.51.100.131");
    const id = await upload(cookie, "LDL cholesterol: 162 mg/dL (0-100)");
    expect((await call(`/api/v1/patients/me/reports/${id}/read`, { cookie, method: "POST" })).status).toBe(403);
    await consent(cookie);

    const blank = await upload(cookie, "x", "Blank");
    const unreadable = await call(`/api/v1/patients/me/reports/${blank}/read`, { cookie, method: "POST" });
    expect(unreadable.status).toBe(422);
    expect(((await unreadable.json()) as { kind: string }).kind).toBe("unreadable");

    const garbled = await upload(cookie, "This page has plenty of text but [fake bad json] in it", "Garbled");
    expect((await call(`/api/v1/patients/me/reports/${garbled}/read`, { cookie, method: "POST" })).status).toBe(422);

    const status = (await (await call("/api/v1/assistant/status", { cookie })).json()) as { remaining: number; limit: number };
    expect(status.remaining).toBe(status.limit);

    const other = await signIn("reader-c@example.com", "198.51.100.132");
    await consent(other);
    const pid = await userId(cookie);
    expect((await call(`/api/v1/patients/${pid}/reports/${id}/read`, { cookie: other, method: "POST" })).status).toBe(403);
    expect((await call(`/api/v1/patients/${pid}/reports/${id}/findings`, { cookie: other })).status).toBe(403);
    expect((await call(`/api/v1/patients/me/reports/${id}/read`, { cookie: other, method: "POST" })).status).toBe(404);
  });
});

describe("shared reports", () => {
  it("show the doctor the out-of-range values of the shared report, and nothing from other reports", async () => {
    const cookie = await signIn("reader-share@example.com", "198.51.100.133");
    await consent(cookie);
    const shared = await upload(cookie, "LDL cholesterol: 162 mg/dL (0-100)\nHemoglobin: 13.5 g/dL (12-16)", "Lipids");
    const other = await upload(cookie, "Creatinine: 2.4 mg/dL (0-1)", "Kidney");
    for (const id of [shared, other]) expect((await call(`/api/v1/patients/me/reports/${id}/read`, { cookie, method: "POST" })).status).toBe(200);

    const made = (await (await call("/api/v1/patients/me/shares", { cookie, body: { reportIds: [shared], expiresIn: "1h" } })).json()) as { url: string };
    const view = (await (await call(`/api/public/shares/${made.url.split("/share/")[1]}`)).json()) as { reports: { title: string; outOfRange: { test: string; flag: string }[] }[] };
    expect(view.reports).toHaveLength(1);
    expect(view.reports[0]!.outOfRange).toEqual([expect.objectContaining({ test: "LDL cholesterol", value: "162", flag: "high" })]);
    expect(JSON.stringify(view)).not.toContain("Creatinine");
  });
});
