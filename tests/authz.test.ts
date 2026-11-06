import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../src/worker/db/client";
import { careLinks, user } from "../src/worker/db/schema";
import { AccessDenied, canAccess } from "../src/worker/dal/authz";
import { addVital, listVitals } from "../src/worker/dal/vitals";
import { getProfile, upsertProfile } from "../src/worker/dal/profile";

const db = getDb(env);
const patient = { userId: "patient-1" };
const stranger = { userId: "stranger-1" };
const carer = { userId: "carer-1" }; // vitals only
const revokedCarer = { userId: "carer-2" };

beforeAll(async () => {
  for (const u of [patient, stranger, carer, revokedCarer]) {
    await db.insert(user).values({ id: u.userId, name: u.userId, email: `${u.userId}@example.com` });
  }
  await db.insert(careLinks).values([
    { patientId: patient.userId, caretakerId: carer.userId, invitedEmail: "carer-1@example.com", status: "active", permissions: ["vitals"] },
    {
      patientId: patient.userId,
      caretakerId: revokedCarer.userId,
      invitedEmail: "carer-2@example.com",
      status: "revoked",
      permissions: ["vitals", "meds", "reports", "alerts"],
    },
  ]);
  await addVital(db, patient, patient.userId, { type: "heart_rate", value: 70 });
});

const ALL = ["owner", "any", "vitals", "meds", "reports", "alerts"] as const;

describe("canAccess", () => {
  it("lets the owner do everything", async () => {
    for (const need of ALL) expect(await canAccess(db, patient, patient.userId, need)).toBe(true);
  });
  it("denies a stranger everything", async () => {
    for (const need of ALL) expect(await canAccess(db, stranger, patient.userId, need)).toBe(false);
  });
  it("gives a caretaker only the granted permissions, never owner", async () => {
    expect(await canAccess(db, carer, patient.userId, "vitals")).toBe(true);
    expect(await canAccess(db, carer, patient.userId, "any")).toBe(true);
    expect(await canAccess(db, carer, patient.userId, "meds")).toBe(false);
    expect(await canAccess(db, carer, patient.userId, "owner")).toBe(false);
  });
  it("gives a revoked caretaker nothing", async () => {
    expect(await canAccess(db, revokedCarer, patient.userId, "vitals")).toBe(false);
    expect(await canAccess(db, revokedCarer, patient.userId, "any")).toBe(false);
  });
});

describe("DAL enforces access", () => {
  it("vitals: a stranger can't read or write", async () => {
    await expect(listVitals(db, stranger, patient.userId)).rejects.toBeInstanceOf(AccessDenied);
    await expect(addVital(db, stranger, patient.userId, { type: "heart_rate", value: 70 })).rejects.toBeInstanceOf(AccessDenied);
  });
  it("vitals: a caretaker with permission can read but not write", async () => {
    expect((await listVitals(db, carer, patient.userId)).length).toBe(1);
    await expect(addVital(db, carer, patient.userId, { type: "heart_rate", value: 70 })).rejects.toBeInstanceOf(AccessDenied);
  });
  it("profile: only the owner writes; strangers can't read", async () => {
    await upsertProfile(db, patient, patient.userId, { timezone: "Asia/Kolkata", conditions: ["hypertension"] });
    expect((await getProfile(db, carer, patient.userId))?.conditions).toEqual(["hypertension"]);
    await expect(getProfile(db, stranger, patient.userId)).rejects.toBeInstanceOf(AccessDenied);
    await expect(upsertProfile(db, carer, patient.userId, { timezone: "UTC" })).rejects.toBeInstanceOf(AccessDenied);
  });
  it("stores the server-side classification and canonical unit", async () => {
    const v = await addVital(db, patient, patient.userId, { type: "blood_pressure", value: 185, value2: 100 });
    expect(v.classification).toBe("critical");
    expect(v.unit).toBe("mmHg");
  });
});
