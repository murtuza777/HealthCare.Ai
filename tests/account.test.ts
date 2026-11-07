import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auditLog, reports, user, vitals } from "../src/worker/db/schema";
import { call, db, metaHeader, pdfBytes, signIn, userId } from "./helpers";

describe("account", () => {
  it("records consent per document version", async () => {
    const cookie = await signIn("account-consent@example.com", "198.51.100.90");
    const before = (await (await call("/api/v1/account/consents", { cookie })).json()) as { terms: boolean };
    expect(before.terms).toBe(false);
    const after = (await (await call("/api/v1/account/consents", { cookie, body: { kinds: ["terms", "privacy"] } })).json()) as { terms: boolean; privacy: boolean; ai_processing: boolean };
    expect(after).toMatchObject({ terms: true, privacy: true, ai_processing: false });
  });

  it("exports everything as a JSON download", async () => {
    const cookie = await signIn("account-export@example.com", "198.51.100.91");
    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "heart_rate", value: 70 } });
    const res = await call("/api/v1/account/export", { cookie });
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="healthcare-ai-export-/);
    const data = (await res.json()) as { account: { email: string }; vitals: unknown[]; format: string };
    expect(data.format).toBe("healthcare-ai-export/1");
    expect(data.account.email).toBe("account-export@example.com");
    expect(data.vitals).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain("r2Key");
  });

  it("deletes the account, its data and its files, and signs out", async () => {
    const cookie = await signIn("account-delete@example.com", "198.51.100.92");
    const uid = await userId(cookie);
    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "heart_rate", value: 70 } });
    const up = await call("/api/v1/patients/me/reports", { cookie, raw: pdfBytes(), headers: { "content-type": "application/pdf", "x-report-meta": metaHeader({ title: "ECG", type: "Cardiology", reportDate: "2026-10-01" }) } });
    expect(up.status).toBe(201);
    const [report] = await db.select().from(reports).where(eq(reports.userId, uid));
    expect(await env.REPORTS.head(report!.r2Key)).not.toBeNull();

    expect((await call("/api/v1/account/delete", { cookie, body: { confirm: "yes" } })).status).toBe(400);
    const res = await call("/api/v1/account/delete", { cookie, body: { confirm: "delete my account" } });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().join(";")).toMatch(/session_token=;|Max-Age=0/);

    expect(await db.select().from(user).where(eq(user.id, uid)).get()).toBeUndefined();
    expect(await db.select().from(vitals).where(eq(vitals.userId, uid))).toHaveLength(0);
    expect(await db.select().from(reports).where(eq(reports.userId, uid))).toHaveLength(0);
    expect(await env.REPORTS.head(report!.r2Key)).toBeNull();
    const trace = await db.select().from(auditLog).where(eq(auditLog.subjectUserId, uid));
    expect(trace.map((t) => t.action)).toContain("account.deleted");
  });

  it("shows the patient when a caretaker looked at their record", async () => {
    const patient = await signIn("account-log-patient@example.com", "198.51.100.93");
    const pid = await userId(patient);
    const inv = (await (await call("/api/v1/care/caretakers", { cookie: patient, body: { email: "account-log-carer@example.com", permissions: ["vitals"] } })).json()) as { inviteUrl: string };
    const carer = await signIn("account-log-carer@example.com", "198.51.100.94");
    await call("/api/v1/care/accept", { cookie: carer, body: { token: inv.inviteUrl.split("/care/accept/")[1] } });
    await call(`/api/v1/patients/${pid}/vitals`, { cookie: carer });
    await call(`/api/v1/patients/${pid}/reports`, { cookie: carer }); // denied: not logged
    const log = (await (await call("/api/v1/account/access-log", { cookie: patient })).json()) as { items: { action: string; entity: string; actorEmail: string }[] };
    expect(log.items).toHaveLength(1);
    expect(log.items[0]).toMatchObject({ action: "caretaker.viewed", entity: "vitals", actorEmail: "account-log-carer@example.com" });
  });
});
