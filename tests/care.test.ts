import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { alerts, careLinks, outbox, pushSubscriptions } from "../src/worker/db/schema";
import { onMissedDoses } from "../src/worker/jobs/care";
import { call, db, signIn, userId } from "./helpers";

const tokenFrom = (url: string) => url.split("/care/accept/")[1]!;

async function invite(patient: string, email: string, permissions: string[]) {
  const res = await call("/api/v1/care/caretakers", { cookie: patient, body: { email, permissions, relation: "Daughter" } });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; inviteUrl: string };
}

describe("caretakers", () => {
  it("invites, accepts with the invited email only, shares only what was granted, and revokes at once", async () => {
    const patient = await signIn("care-patient@example.com", "198.51.100.80");
    const pid = await userId(patient);
    await call("/api/v1/patients/me/vitals", { cookie: patient, body: { type: "heart_rate", value: 72 } });

    const { id, inviteUrl } = await invite(patient, "Care-Daughter@Example.com", ["vitals", "alerts"]);
    const token = tokenFrom(inviteUrl);

    const stranger = await signIn("care-stranger@example.com", "198.51.100.81");
    const wrong = await call("/api/v1/care/accept", { cookie: stranger, body: { token } });
    expect(wrong.status).toBe(400);
    expect((await call("/api/v1/care/accept", { cookie: patient, body: { token } })).status).toBe(400);

    const caretaker = await signIn("care-daughter@example.com", "198.51.100.82");
    const preview = (await (await call(`/api/v1/care/invites/${token}`, { cookie: caretaker })).json()) as { permissions: string[] };
    expect(preview.permissions).toEqual(["vitals", "alerts"]);
    const ok = await call("/api/v1/care/accept", { cookie: caretaker, body: { token } });
    expect(ok.status).toBe(200);
    expect((await call("/api/v1/care/accept", { cookie: caretaker, body: { token } })).status).toBe(400); // single use

    const summary = (await (await call(`/api/v1/care/patients/${pid}/summary`, { cookie: caretaker })).json()) as {
      latest: Record<string, unknown> | null;
      medications: unknown;
      reports: unknown;
    };
    expect(summary.latest).toHaveProperty("heart_rate");
    expect(summary.medications).toBeNull();
    expect(summary.reports).toBeNull();
    expect((await call(`/api/v1/patients/${pid}/vitals`, { cookie: caretaker })).status).toBe(200);
    expect((await call(`/api/v1/patients/${pid}/reports`, { cookie: caretaker })).status).toBe(403);
    expect((await call(`/api/v1/patients/${pid}/medications`, { cookie: caretaker })).status).toBe(403);
    // Caretakers can read, never write.
    expect((await call(`/api/v1/patients/${pid}/vitals`, { cookie: caretaker, body: { type: "heart_rate", value: 80 } })).status).toBe(403);
    expect((await call(`/api/v1/care/patients/${pid}/summary`, { cookie: stranger })).status).toBe(404);

    // Permissions can change; removal ends access immediately.
    await call(`/api/v1/care/caretakers/${id}`, { cookie: patient, method: "PATCH", body: { permissions: ["vitals", "meds"] } });
    expect((await call(`/api/v1/patients/${pid}/medications`, { cookie: caretaker })).status).toBe(200);
    expect((await call(`/api/v1/care/caretakers/${id}`, { cookie: patient, method: "DELETE" })).status).toBe(200);
    expect((await call(`/api/v1/patients/${pid}/vitals`, { cookie: caretaker })).status).toBe(403);
    expect((await call(`/api/v1/care/patients/${pid}/summary`, { cookie: caretaker })).status).toBe(404);
  });

  it("rejects expired invites and self-invites", async () => {
    const patient = await signIn("care-expiry@example.com", "198.51.100.83");
    expect((await call("/api/v1/care/caretakers", { cookie: patient, body: { email: "care-expiry@example.com", permissions: ["vitals"] } })).status).toBe(400);
    const { id, inviteUrl } = await invite(patient, "care-late@example.com", ["vitals"]);
    await db.update(careLinks).set({ createdAt: new Date(Date.now() - 8 * 86400000) }).where(eq(careLinks.id, id));
    const late = await signIn("care-late@example.com", "198.51.100.84");
    expect((await call("/api/v1/care/accept", { cookie: late, body: { token: tokenFrom(inviteUrl) } })).status).toBe(400);
  });

  it("alerts caretakers about emergency readings, red-flag symptoms and missed doses", async () => {
    const patient = await signIn("care-alerts-patient@example.com", "198.51.100.85");
    const pid = await userId(patient);
    const { inviteUrl } = await invite(patient, "care-alerts-son@example.com", ["vitals", "alerts"]);
    const son = await signIn("care-alerts-son@example.com", "198.51.100.86");
    await call("/api/v1/care/accept", { cookie: son, body: { token: tokenFrom(inviteUrl) } });
    const sonId = await userId(son);
    await db.insert(pushSubscriptions).values({ userId: sonId, endpoint: "https://push.example.com/son", keys: { p256dh: "x", auth: "y" } });

    await call("/api/v1/patients/me/vitals", { cookie: patient, body: { type: "blood_pressure", value: 190, value2: 125 } });
    await call("/api/v1/patients/me/symptoms", { cookie: patient, body: { type: "chest pain", severity: 8, accompaniedBy: ["shortness of breath"] } });
    await onMissedDoses(env, db, [{ userId: pid, medicationId: crypto.randomUUID(), scheduledAt: new Date(Date.now() - 3 * 3600_000), name: "Aspirin", dose: "75 mg", timezone: "UTC" }], new Date());

    const rows = await db.select().from(alerts).where(eq(alerts.userId, pid));
    expect(rows.map((r) => r.kind).sort()).toEqual(["critical-reading", "missed-dose", "red-flag-symptom"]);
    const pushes = await db.select().from(outbox).where(and(eq(outbox.kind, "care:alert"), eq(outbox.channel, "push")));
    expect(pushes.filter((p) => (p.payload as { url: string }).url === `/app/care/${pid}`)).toHaveLength(3);

    const list = (await (await call(`/api/v1/care/patients/${pid}/summary`, { cookie: son })).json()) as { alerts: { id: string }[] };
    expect(list.alerts).toHaveLength(3);
    expect((await call(`/api/v1/care/patients/${pid}/alerts/${list.alerts[0]!.id}/ack`, { cookie: son, method: "POST" })).status).toBe(200);
  });
});
