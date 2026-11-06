import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { sniffMime } from "../src/shared/reports";
import { reports, shareAccessLog } from "../src/worker/db/schema";
import { createShare } from "../src/worker/dal/shares";
import { call, db, metaHeader, pdfBytes, signIn, userId } from "./helpers";

describe("sniffMime", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);
  it("recognises allowed types by signature", () => {
    expect(sniffMime(pdfBytes())).toBe("application/pdf");
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  });
  it("rejects anything else, whatever it claims to be", () => {
    expect(sniffMime(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffMime(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffMime(new Uint8Array([]))).toBeNull();
  });
});

const meta = { title: "Lipid profile", type: "Laboratory", reportDate: "2026-10-01", doctor: "Dr. Rao" };

async function upload(cookie: string, body: BodyInit, m: unknown = meta, contentType = "application/pdf") {
  return call("/api/v1/patients/me/reports", {
    cookie,
    raw: body,
    headers: { "content-type": contentType, "x-report-meta": metaHeader(m) },
  });
}

describe("reports API", () => {
  let owner = "";
  let other = "";
  let ownerId = "";
  let reportId = "";

  beforeAll(async () => {
    owner = await signIn("rep-owner@example.com", "198.51.100.20");
    other = await signIn("rep-other@example.com", "198.51.100.21");
    ownerId = await userId(owner);
  });

  it("uploads a PDF to R2 and lists it without exposing the storage key", async () => {
    const res = await upload(owner, pdfBytes("cholesterol 190"));
    expect(res.status).toBe(201);
    const { report } = (await res.json()) as { report: { id: string; mime: string; size: number } & Record<string, unknown> };
    reportId = report.id;
    expect(report.mime).toBe("application/pdf");
    expect(report).not.toHaveProperty("r2Key");

    const row = await db.select().from(reports).where(eq(reports.id, reportId)).get();
    expect(await env.REPORTS.head(row!.r2Key)).not.toBeNull();

    const list = (await (await call("/api/v1/patients/me/reports", { cookie: owner })).json()) as { items: Record<string, unknown>[] };
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).not.toHaveProperty("r2Key");
  });

  it("serves the file to its owner with safe headers", async () => {
    const res = await call(`/api/v1/patients/me/reports/${reportId}/file?download=1`, { cookie: owner });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="Lipid profile.pdf"');
    expect(new TextDecoder().decode(await res.arrayBuffer())).toContain("cholesterol 190");
  });

  it("never serves the file to another user", async () => {
    expect((await call(`/api/v1/patients/me/reports/${reportId}/file`, { cookie: other })).status).toBe(404);
    expect((await call(`/api/v1/patients/${ownerId}/reports/${reportId}/file`, { cookie: other })).status).toBe(403);
    expect((await call(`/api/v1/patients/${ownerId}/reports`, { cookie: other })).status).toBe(403);
    expect((await call(`/api/v1/patients/me/reports/${reportId}`, { cookie: other, method: "DELETE" })).status).toBe(404);
    expect((await call(`/api/v1/patients/me/reports/${reportId}/file`)).status).toBe(401);
  });

  it("rejects disguised, oversized and badly described uploads", async () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect((await upload(owner, html, meta, "application/pdf")).status).toBe(415);
    const big = await call("/api/v1/patients/me/reports", {
      cookie: owner,
      raw: pdfBytes(),
      headers: { "content-type": "application/pdf", "x-report-meta": metaHeader(meta), "content-length": String(11 * 1024 * 1024) },
    });
    expect(big.status).toBe(413);
    expect((await upload(owner, pdfBytes(), { title: "", type: "Laboratory" })).status).toBe(400);
    expect((await upload(owner, pdfBytes(), { title: "x", type: "Astrology" })).status).toBe(400);
  });

  describe("share links", () => {
    let url = "";
    let token = "";
    let shareId = "";

    it("can't include another user's report", async () => {
      const res = await call("/api/v1/patients/me/shares", { cookie: other, body: { reportIds: [reportId], expiresIn: "1h" } });
      expect(res.status).toBe(400);
    });

    it("creates a link whose token is not stored", async () => {
      const res = await call("/api/v1/patients/me/shares", { cookie: owner, body: { reportIds: [reportId], expiresIn: "24h" } });
      expect(res.status).toBe(201);
      ({ url, id: shareId } = (await res.json()) as { url: string; id: string });
      token = url.split("/share/")[1]!;
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const rows = await env.DB.prepare("SELECT token_hash FROM shares WHERE id = ?").bind(shareId).all<{ token_hash: string }>();
      expect(rows.results[0]!.token_hash).not.toContain(token);
    });

    it("lets anyone with the link view and download, and logs each opening", async () => {
      const view = await call(`/api/public/shares/${token}`, { ip: "192.0.2.5" });
      expect(view.status).toBe(200);
      const body = (await view.json()) as { patientName: string; reports: { id: string; title: string }[]; vitals: unknown };
      expect(body.reports.map((r) => r.title)).toEqual(["Lipid profile"]);
      expect(body.vitals).toBeNull();

      const file = await call(`/api/public/shares/${token}/reports/${reportId}/file`);
      expect(file.status).toBe(200);
      expect(new TextDecoder().decode(await file.arrayBuffer())).toContain("cholesterol 190");

      const log = await db.select().from(shareAccessLog).where(eq(shareAccessLog.shareId, shareId));
      expect(log).toHaveLength(1);
      expect(log[0]!.ipHash).not.toBe("192.0.2.5"); // hashed, never raw

      const list = (await (await call("/api/v1/patients/me/shares", { cookie: owner })).json()) as {
        items: ({ id: string; opens: number; active: boolean } & Record<string, unknown>)[];
      };
      expect(list.items[0]).toMatchObject({ id: shareId, opens: 1, active: true });
      expect(list.items[0]).not.toHaveProperty("tokenHash");
    });

    it("only exposes reports that are in the share", async () => {
      const second = (await (await upload(owner, pdfBytes("private"), { title: "Private", type: "General" })).json()) as { report: { id: string } };
      expect((await call(`/api/public/shares/${token}/reports/${second.report.id}/file`)).status).toBe(404);
    });

    it("stops working when revoked; bad tokens look the same", async () => {
      expect((await call(`/api/v1/patients/me/shares/${shareId}`, { cookie: other, method: "DELETE" })).status).toBe(404);
      expect((await call(`/api/v1/patients/me/shares/${shareId}`, { cookie: owner, method: "DELETE" })).status).toBe(200);
      expect((await call(`/api/public/shares/${token}`)).status).toBe(404);
      expect((await call(`/api/public/shares/${token}/reports/${reportId}/file`)).status).toBe(404);
      expect((await call(`/api/public/shares/not-a-real-token`)).status).toBe(404);
    });

    it("stops working when expired", async () => {
      const longAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const { token: old } = await createShare(db, { userId: ownerId }, ownerId, { reportIds: [reportId], expiresIn: "7d", includeVitals: false }, longAgo);
      expect((await call(`/api/public/shares/${old}`)).status).toBe(404);
    });

    it("includes the latest vitals only when asked", async () => {
      await call("/api/v1/patients/me/vitals", { cookie: owner, body: { type: "blood_pressure", value: 132, value2: 84 } });
      const res = await call("/api/v1/patients/me/shares", { cookie: owner, body: { reportIds: [reportId], expiresIn: "1h", includeVitals: true } });
      const t = ((await res.json()) as { url: string }).url.split("/share/")[1]!;
      const view = (await (await call(`/api/public/shares/${t}`)).json()) as { vitals: { type: string; value: number }[] };
      expect(view.vitals).toEqual([expect.objectContaining({ type: "blood_pressure", value: 132 })]);
    });
  });

  it("deletes the database row and the R2 file", async () => {
    const row = await db.select().from(reports).where(eq(reports.id, reportId)).get();
    expect((await call(`/api/v1/patients/me/reports/${reportId}`, { cookie: owner, method: "DELETE" })).status).toBe(200);
    expect(await env.REPORTS.head(row!.r2Key)).toBeNull();
    expect((await call(`/api/v1/patients/me/reports/${reportId}/file`, { cookie: owner })).status).toBe(404);
  });
});
