import { describe, expect, it } from "vitest";
import { call, signIn, userId } from "./helpers";

type Item = { id: string; kind: string; at: string; title: string; detail: string; tone: string };
const feed = async (cookie: string, path = "/api/v1/patients/me/timeline") => (await (await call(path, { cookie })).json()) as { items: Item[]; next: string | null };

describe("timeline", () => {
  it("merges readings and symptoms newest first, and filters by kind", async () => {
    const cookie = await signIn("timeline-a@example.com", "198.51.100.120");
    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "blood_pressure", value: 185, value2: 121, measuredAt: "2026-11-01T08:00:00Z" } });
    await call("/api/v1/patients/me/symptoms", { cookie, body: { type: "headache", severity: 4, accompaniedBy: [], occurredAt: "2026-11-02T08:00:00Z" } });
    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "heart_rate", value: 72, measuredAt: "2026-11-03T08:00:00Z" } });

    const all = await feed(cookie);
    const mine = all.items.filter((i) => i.kind !== "alert");
    expect(mine.map((i) => i.kind)).toEqual(["vital", "symptom", "vital"]);
    expect(mine[2]).toMatchObject({ title: "blood_pressure", detail: "185/121 mmHg", tone: "critical" });
    // The emergency-range reading also raised an alert, which is part of the history.
    expect(all.items.some((i) => i.kind === "alert")).toBe(true);

    const onlySymptoms = await feed(cookie, "/api/v1/patients/me/timeline?kinds=symptom");
    expect(onlySymptoms.items.map((i) => i.title)).toEqual(["headache"]);

    const older = await feed(cookie, "/api/v1/patients/me/timeline?before=2026-11-02T00:00:00.000Z&kinds=vital,symptom");
    expect(older.items.map((i) => i.title)).toEqual(["blood_pressure"]);
  });

  it("shows a caretaker only what they were granted, and strangers nothing", async () => {
    const patient = await signIn("timeline-p@example.com", "198.51.100.121");
    const pid = await userId(patient);
    await call("/api/v1/patients/me/vitals", { cookie: patient, body: { type: "heart_rate", value: 70 } });
    await call("/api/v1/patients/me/medications", { cookie: patient, body: { name: "Aspirin", dose: "75 mg", schedule: { times: ["08:00"] }, startDate: "2026-01-01" } });

    const stranger = await signIn("timeline-s@example.com", "198.51.100.122");
    expect((await call(`/api/v1/patients/${pid}/timeline`, { cookie: stranger })).status).toBe(403);

    const inv = (await (await call("/api/v1/care/caretakers", { cookie: patient, body: { email: "timeline-c@example.com", permissions: ["meds"], relation: "Son" } })).json()) as { inviteUrl: string };
    const caretaker = await signIn("timeline-c@example.com", "198.51.100.123");
    await call("/api/v1/care/accept", { cookie: caretaker, body: { token: inv.inviteUrl.split("/care/accept/")[1] } });
    const seen = await feed(caretaker, `/api/v1/patients/${pid}/timeline`);
    expect(seen.items.filter((i) => i.kind === "vital")).toHaveLength(0);
  });
});
