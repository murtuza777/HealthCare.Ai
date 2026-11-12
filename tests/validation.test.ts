import { describe, expect, it } from "vitest";
import { readingsFromCsv } from "../src/shared/csv-import";
import { medicationInputSchema } from "../src/shared/medications";
import { profileInputSchema } from "../src/shared/profile";
import { reminderInputSchema } from "../src/shared/reminders";
import { symptomInputSchema } from "../src/shared/symptoms";
import { vitalInputSchema } from "../src/shared/vitals";
import { call, signIn } from "./helpers";

const ok = (schema: { safeParse(v: unknown): { success: boolean } }, v: unknown) => schema.safeParse(v).success;
const day = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

describe("input rules found by testing as a user", () => {
  it("treats a medicine time or day entered twice as one", () => {
    const med = medicationInputSchema.parse({ name: "Amlodipine", dose: "5 mg", schedule: { times: ["20:00", "08:00", "08:00"], days: [3, 1, 1] }, startDate: "2026-11-01" });
    expect(med.schedule).toEqual({ times: ["08:00", "20:00"], days: [1, 3] });
    const many = Array.from({ length: 9 }, (_, i) => `0${i}:00`);
    expect(ok(medicationInputSchema, { name: "X", dose: "1", schedule: { times: many }, startDate: "2026-11-01" })).toBe(false);
  });

  it("keeps readings to one decimal and to believable dates", () => {
    expect(vitalInputSchema.parse({ type: "weight", value: 81.4567 }).value).toBe(81.5);
    expect(vitalInputSchema.parse({ type: "blood_pressure", value: 120.04, value2: 79.96 })).toMatchObject({ value: 120, value2: 80 });
    expect(ok(vitalInputSchema, { type: "heart_rate", value: 70, measuredAt: "1800-01-01T00:00:00Z" })).toBe(false);
    expect(ok(vitalInputSchema, { type: "heart_rate", value: 70, measuredAt: "2015-06-01T00:00:00Z" })).toBe(true);
  });

  it("doesn't accept a symptom from the future", () => {
    expect(ok(symptomInputSchema, { type: "headache", severity: 3, occurredAt: new Date(Date.now() + 86_400_000).toISOString() })).toBe(false);
    expect(ok(symptomInputSchema, { type: "headache", severity: 3, occurredAt: new Date(Date.now() - 3_600_000).toISOString() })).toBe(true);
    expect(ok(symptomInputSchema, { type: "headache", severity: 3 })).toBe(true);
  });

  it("keeps reminders within two years and explains a bad date", () => {
    expect(ok(reminderInputSchema, { kind: "custom", title: "x", dueAt: "2999-01-01T00:00:00Z" })).toBe(false);
    const bad = reminderInputSchema.safeParse({ kind: "custom", title: "x", dueAt: "not a date" });
    expect(bad.success ? "" : bad.error.issues[0]!.message).toBe("Choose a valid date and time");
    expect(ok(reminderInputSchema, { kind: "appointment", title: "Dr Mehta", dueAt: new Date(Date.now() + 86_400_000).toISOString() })).toBe(true);
  });

  it("checks profile dates and the emergency phone number", () => {
    expect(ok(profileInputSchema, { dateOfBirth: day(400) })).toBe(false);
    expect(ok(profileInputSchema, { dateOfBirth: "1850-01-01" })).toBe(false);
    expect(ok(profileInputSchema, { dateOfBirth: "1964-03-12" })).toBe(true);
    expect(ok(profileInputSchema, { dateOfBirth: null })).toBe(true);
    expect(ok(profileInputSchema, { lastHeartAttackAt: day(30) })).toBe(false);
    expect(ok(profileInputSchema, { lastHeartAttackAt: day(-30) })).toBe(true);
    const contact = (phone: string) => ok(profileInputSchema, { emergencyContact: { name: "Sara", phone } });
    expect(contact("abc")).toBe(false);
    expect(contact("12")).toBe(false);
    expect(contact("call me")).toBe(false);
    expect(contact("+91 12345 67890")).toBe(true);
    expect(contact("(020) 7946-0958")).toBe(true);
  });

  it("names a date from the file when day and month could be swapped", () => {
    const r = readingsFromCsv("Date,Pulse\n25/10/2026,70\n03/10/2026,72");
    expect(r.ambiguousDates).toBe(true);
    expect(r.ambiguousExample).toBe("03/10/2026");
    expect(readingsFromCsv("Date,Pulse\n25/10/2026,70").ambiguousExample).toBeUndefined();
  });
});

describe("the same rules through the API", () => {
  it("rejects what the browser forms can't catch", async () => {
    const cookie = await signIn("validation-a@example.com", "198.51.100.170");
    const P = "/api/v1/patients/me";
    const med = await call(`${P}/medications`, { cookie, body: { name: "Amlodipine", dose: "5 mg", schedule: { times: ["08:00", "08:00"] }, startDate: day(-1) } });
    expect(med.status).toBe(201);
    expect(((await med.json()) as { medication: { schedule: { times: string[] } } }).medication.schedule.times).toEqual(["08:00"]);

    expect((await call(`${P}/symptoms`, { cookie, body: { type: "headache", severity: 3, accompaniedBy: [], occurredAt: "2090-01-01T00:00:00Z" } })).status).toBe(400);
    expect((await call(`${P}/vitals`, { cookie, body: { type: "heart_rate", value: 70, measuredAt: "1800-01-01T00:00:00Z" } })).status).toBe(400);
    expect((await call(`${P}/reminders`, { cookie, body: { kind: "custom", title: "far", dueAt: "2999-01-01T00:00:00Z" } })).status).toBe(400);
    expect((await call(`${P}/profile`, { cookie, method: "PUT", body: { dateOfBirth: "2090-01-01" } })).status).toBe(400);
    expect((await call(`${P}/profile`, { cookie, method: "PUT", body: { emergencyContact: { name: "Sara", phone: "abc" } } })).status).toBe(400);

    const saved = await call(`${P}/vitals`, { cookie, body: { type: "weight", value: 81.4567 } });
    expect(((await saved.json()) as { vital: { value: number } }).vital.value).toBe(81.5);
  });
});
