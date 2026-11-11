import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inQuietHours } from "../src/shared/care";
import { findInsights, type InsightInput } from "../src/shared/insights";
import { alerts, outbox, pushSubscriptions } from "../src/worker/db/schema";
import { raiseAlert } from "../src/worker/dal/alerts";
import { reviewPatient } from "../src/worker/jobs/monitor";
import { call, db, signIn, userId } from "./helpers";

const NOW = new Date("2026-11-10T09:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const bp = (sys: number, dia: number, daysAgo: number) => ({ value: sys, value2: dia, measuredAt: ago(daysAgo) });
const base = (over: Partial<InsightInput> = {}): InsightInput => ({
  now: NOW,
  bloodPressure: [],
  heartRate: [],
  weight: [],
  doses: { due: 0, missed: 0, skipped: 0 },
  lastReadingAt: ago(0.5),
  totalReadings: 10,
  ...over,
});
const kinds = (i: InsightInput) => findInsights(i).map((x) => x.kind);

describe("insight rules", () => {
  it("says nothing about a steady, healthy record", () => {
    expect(kinds(base({ bloodPressure: [bp(122, 78, 1), bp(124, 80, 3), bp(120, 76, 5), bp(121, 79, 9), bp(123, 77, 11), bp(122, 78, 13)], doses: { due: 14, missed: 0, skipped: 1 } }))).toEqual([]);
  });

  it("notices blood pressure rising week on week", () => {
    const found = findInsights(base({ bloodPressure: [bp(146, 92, 1), bp(148, 94, 3), bp(150, 95, 5), bp(130, 84, 8), bp(132, 85, 10), bp(131, 83, 12)] }));
    expect(found.map((f) => f.kind)).toEqual(["insight:bp-rising"]);
    expect(found[0]!.body).toContain("148/94");
    expect(found[0]!.body).toContain("131/84");
    expect(found[0]!.body).toMatch(/don't change any medicine/);
  });

  it("doesn't call a rise from low to normal a problem, or judge on too few readings", () => {
    expect(kinds(base({ bloodPressure: [bp(118, 76, 1), bp(120, 78, 3), bp(119, 77, 5), bp(104, 68, 8), bp(106, 70, 10), bp(105, 69, 12)] }))).toEqual([]);
    expect(kinds(base({ bloodPressure: [bp(170, 100, 1), bp(168, 98, 2)] }))).toEqual([]);
  });

  it("notices a week that stayed high", () => {
    expect(kinds(base({ bloodPressure: [bp(150, 92, 1), bp(148, 90, 3), bp(152, 95, 5)] }))).toEqual(["insight:bp-high"]);
  });

  it("notices a fast resting pulse", () => {
    const hr = (v: number, d: number) => ({ value: v, measuredAt: ago(d) });
    expect(kinds(base({ heartRate: [hr(104, 1), hr(108, 2), hr(101, 4)] }))).toEqual(["insight:pulse-high"]);
    expect(kinds(base({ heartRate: [hr(84, 1), hr(88, 2), hr(120, 4)] }))).toEqual([]);
  });

  it("notices doses not being taken, but not one slip", () => {
    expect(kinds(base({ doses: { due: 14, missed: 4, skipped: 1 } }))).toEqual(["insight:doses-missed"]);
    expect(kinds(base({ doses: { due: 14, missed: 1, skipped: 0 } }))).toEqual([]);
    expect(kinds(base({ doses: { due: 3, missed: 3, skipped: 0 } }))).toEqual([]);
  });

  it("notices sudden weight gain", () => {
    const w = (v: number, d: number) => ({ value: v, measuredAt: ago(d) });
    const found = findInsights(base({ weight: [w(80.2, 6), w(80.0, 4), w(82.4, 0.5)] }));
    expect(found.map((f) => f.kind)).toEqual(["insight:weight-gain"]);
    expect(found[0]!.title).toBe("Weight is up 2.4 kg in a week");
    expect(kinds(base({ weight: [w(80.2, 6), w(81.0, 0.5)] }))).toEqual([]);
    // An old "latest" weight isn't news.
    expect(kinds(base({ weight: [w(80, 7), w(83, 4)] }))).toEqual([]);
  });

  it("notices when logging has stopped", () => {
    expect(kinds(base({ lastReadingAt: ago(9) }))).toEqual(["insight:no-readings"]);
    expect(kinds(base({ lastReadingAt: ago(3) }))).toEqual([]);
    // Someone who never really started isn't nagged.
    expect(kinds(base({ lastReadingAt: ago(30), totalReadings: 1 }))).toEqual([]);
  });
});

describe("quiet hours", () => {
  it("handles ranges that cross midnight, in the caretaker's time zone", () => {
    const q = { from: "22:00", to: "07:00" };
    expect(inQuietHours(q, new Date("2026-11-10T23:30:00Z"), "UTC")).toBe(true);
    expect(inQuietHours(q, new Date("2026-11-10T06:59:00Z"), "UTC")).toBe(true);
    expect(inQuietHours(q, new Date("2026-11-10T07:00:00Z"), "UTC")).toBe(false);
    expect(inQuietHours(q, new Date("2026-11-10T12:00:00Z"), "UTC")).toBe(false);
    // 17:00 UTC is 22:30 in Kolkata.
    expect(inQuietHours(q, new Date("2026-11-10T17:00:00Z"), "Asia/Kolkata")).toBe(true);
    expect(inQuietHours({ from: "13:00", to: "15:00" }, new Date("2026-11-10T14:00:00Z"), "UTC")).toBe(true);
    expect(inQuietHours(null, new Date(), "UTC")).toBe(false);
    expect(inQuietHours(q, new Date("2026-11-10T23:30:00Z"), "Not/AZone")).toBe(true);
  });
});

describe("daily review", () => {
  it("raises each finding once, shows it to the patient, and lets them dismiss it", async () => {
    const cookie = await signIn("insight-a@example.com", "198.51.100.140");
    const id = await userId(cookie);
    const now = new Date();
    const at = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
    for (const [sys, dia, d] of [[150, 94, 1], [152, 96, 2], [149, 93, 4]] as const) {
      await call("/api/v1/patients/me/vitals", { cookie, body: { type: "blood_pressure", value: sys, value2: dia, measuredAt: at(d) } });
    }
    expect(await reviewPatient(env, db, id, now)).toBe(1);
    expect(await reviewPatient(env, db, id, now)).toBe(0); // not repeated

    const mine = (await (await call("/api/v1/patients/me/alerts", { cookie })).json()) as { items: { id: string; kind: string; title: string; acknowledgedAt: string | null }[] };
    const insight = mine.items.find((a) => a.kind === "insight:bp-high")!;
    expect(insight.title).toBe("Blood pressure has stayed high this week");

    expect((await call(`/api/v1/patients/me/alerts/${insight.id}/ack`, { cookie, method: "POST" })).status).toBe(200);
    const stranger = await signIn("insight-s@example.com", "198.51.100.141");
    expect((await call(`/api/v1/patients/${id}/alerts/${insight.id}/ack`, { cookie: stranger, method: "POST" })).status).toBe(403);
  });

  it("holds non-urgent alerts during a caretaker's quiet hours, but never emergencies", async () => {
    const patient = await signIn("insight-p@example.com", "198.51.100.142");
    const pid = await userId(patient);
    const inv = (await (await call("/api/v1/care/caretakers", { cookie: patient, body: { email: "insight-c@example.com", permissions: ["alerts"], relation: "Son" } })).json()) as { inviteUrl: string };
    const caretaker = await signIn("insight-c@example.com", "198.51.100.143");
    await call("/api/v1/care/accept", { cookie: caretaker, body: { token: inv.inviteUrl.split("/care/accept/")[1] } });
    const cid = await userId(caretaker);
    await db.insert(pushSubscriptions).values({ userId: cid, endpoint: "https://push.example/insight-c", keys: { p256dh: "x", auth: "y" } });

    expect((await call(`/api/v1/care/patients/${pid}/quiet-hours`, { cookie: caretaker, method: "PUT", body: { quietHours: { from: "22:00", to: "07:00" } } })).status).toBe(200);
    expect((await call(`/api/v1/care/patients/${pid}/quiet-hours`, { cookie: patient, method: "PUT", body: { quietHours: null } })).status).toBe(404);
    expect((await call(`/api/v1/care/patients/${pid}/quiet-hours`, { cookie: caretaker, method: "PUT", body: { quietHours: { from: "25:00", to: "07:00" } } })).status).toBe(400);
    const summary = (await (await call(`/api/v1/care/patients/${pid}/summary`, { cookie: caretaker })).json()) as { quietHours: unknown };
    expect(summary.quietHours).toEqual({ from: "22:00", to: "07:00" });

    const pushes = async () => (await db.select().from(outbox).where(and(eq(outbox.channel, "push"), eq(outbox.kind, "care:alert")))).filter((o) => String((o.payload as { url?: string }).url).endsWith(pid)).length;
    const night = new Date("2026-11-10T23:30:00Z");
    await raiseAlert(env, db, pid, { severity: "warning", kind: "missed-dose", title: "Missed a dose", body: "x" }, 0, night);
    expect(await pushes()).toBe(0);
    // Still recorded for the dashboard.
    expect((await db.select().from(alerts).where(eq(alerts.userId, pid))).length).toBe(1);

    await raiseAlert(env, db, pid, { severity: "critical", kind: "critical-reading", title: "Emergency reading", body: "x" }, 0, night);
    expect(await pushes()).toBe(1);

    await raiseAlert(env, db, pid, { severity: "warning", kind: "missed-dose", title: "Missed a dose", body: "x" }, 0, new Date("2026-11-10T12:00:00Z"));
    expect(await pushes()).toBe(2);
  });
});
