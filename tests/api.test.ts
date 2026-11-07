import { describe, expect, it } from "vitest";
import { call, signIn as signInBase } from "./helpers";

// The first sign-ups also check that a wrong verification code is rejected.
const signIn = (email: string, ip: string) => signInBase(email, ip, { checkWrongCode: true });

describe("API", () => {
  it("rejects requests without a session", async () => {
    expect((await call("/api/v1/me")).status).toBe(401);
    expect((await call("/api/v1/patients/me/vitals")).status).toBe(401);
  });

  it("health check is public", async () => {
    expect((await call("/api/health")).status).toBe(200);
  });

  it("signs in with an email code and keeps each user's data separate", async () => {
    const alice = await signIn("alice@example.com", "203.0.113.10");
    const bob = await signIn("bob@example.com", "203.0.113.11");

    const me = await call("/api/v1/me", { cookie: alice });
    expect(me.status).toBe(200);
    const aliceId = ((await me.json()) as { user: { id: string } }).user.id;

    const added = await call("/api/v1/patients/me/vitals", { cookie: alice, body: { type: "blood_pressure", value: 128, value2: 82 } });
    expect(added.status).toBe(201);
    expect(((await added.json()) as { vital: { classification: string } }).vital.classification).toBe("high");

    const aliceList = (await (await call("/api/v1/patients/me/vitals", { cookie: alice })).json()) as { items: unknown[] };
    expect(aliceList.items).toHaveLength(1);
    const bobList = (await (await call("/api/v1/patients/me/vitals", { cookie: bob })).json()) as { items: unknown[] };
    expect(bobList.items).toHaveLength(0);

    // Bob can't read or write Alice's data by id.
    expect((await call(`/api/v1/patients/${aliceId}/vitals`, { cookie: bob })).status).toBe(403);
    expect((await call(`/api/v1/patients/${aliceId}/vitals`, { cookie: bob, body: { type: "heart_rate", value: 60 } })).status).toBe(403);
  });

  it("validates input", async () => {
    const carol = await signIn("carol@example.com", "203.0.113.12");
    const bad = await call("/api/v1/patients/me/vitals", { cookie: carol, body: { type: "blood_pressure", value: 120 } });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toBe("invalid_input");
  });

  it("manages medications and keeps them private", async () => {
    const dan = await signIn("dan@example.com", "203.0.113.13");
    const eve = await signIn("eve@example.com", "203.0.113.14");

    const created = await call("/api/v1/patients/me/medications", {
      cookie: dan,
      body: { name: "Atorvastatin", dose: "20 mg", schedule: { times: ["21:00"] }, startDate: "2026-01-01" },
    });
    expect(created.status).toBe(201);
    const medId = ((await created.json()) as { medication: { id: string } }).medication.id;

    // Eve can't stop or delete Dan's medication by id (scoped to her own account → 404).
    expect((await call(`/api/v1/patients/me/medications/${medId}`, { cookie: eve, method: "PATCH", body: { active: false } })).status).toBe(404);
    expect((await call(`/api/v1/patients/me/medications/${medId}`, { cookie: eve, method: "DELETE" })).status).toBe(404);

    const stopped = await call(`/api/v1/patients/me/medications/${medId}`, { cookie: dan, method: "PATCH", body: { active: false } });
    expect(stopped.status).toBe(200);
    const active = (await (await call("/api/v1/patients/me/medications", { cookie: dan })).json()) as { items: unknown[] };
    expect(active.items).toHaveLength(0);
    const all = (await (await call("/api/v1/patients/me/medications?all=1", { cookie: dan })).json()) as { items: unknown[] };
    expect(all.items).toHaveLength(1);
  });

  it("flags emergency symptoms and returns the latest vitals", async () => {
    const fay = await signIn("fay@example.com", "203.0.113.15");
    const res = await call("/api/v1/patients/me/symptoms", {
      cookie: fay,
      body: { type: "chest pain", severity: 6, accompaniedBy: ["shortness of breath"] },
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { redFlag: { emergency: boolean } }).redFlag.emergency).toBe(true);

    await call("/api/v1/patients/me/vitals", { cookie: fay, body: { type: "heart_rate", value: 64 } });
    await call("/api/v1/patients/me/vitals", { cookie: fay, body: { type: "heart_rate", value: 88 } });
    const latest = (await (await call("/api/v1/patients/me/vitals/latest", { cookie: fay })).json()) as {
      latest: Record<string, { value: number }>;
    };
    expect(latest.latest.heart_rate?.value).toBe(88);
    expect(latest.latest.blood_pressure).toBeUndefined();
  });

  it("saves a profile and marks onboarding complete", async () => {
    const gus = await signIn("gus@example.com", "203.0.113.16");
    const saved = await call("/api/v1/patients/me/profile", {
      cookie: gus,
      method: "PUT",
      body: { name: "Gus", timezone: "Asia/Kolkata", country: "in", conditions: ["Hypertension"] },
    });
    expect(saved.status).toBe(200);
    const { profile } = (await saved.json()) as { profile: { name: string; country: string; onboardedAt: string | null } };
    expect(profile.name).toBe("Gus");
    expect(profile.country).toBe("IN");
    expect(profile.onboardedAt).toBeTruthy();

    const badTz = await call("/api/v1/patients/me/profile", { cookie: gus, method: "PUT", body: { timezone: "Mars/Olympus" } });
    expect(badTz.status).toBe(400);
  });
});
