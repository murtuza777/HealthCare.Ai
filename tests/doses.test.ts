import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { dosesOn, localDateIn, zonedToUtc } from "../src/shared/doses";
import { doseEvents, outbox } from "../src/worker/db/schema";
import { generateUpcomingDoses, markMissed } from "../src/worker/dal/doses";
import { sendDoseReminders } from "../src/worker/jobs/scheduler";
import { b64urlToBytes, bytesToB64url, encryptPayload } from "../src/worker/notifications/push";
import { call, db, signIn, userId } from "./helpers";

describe("schedules in the patient's timezone", () => {
  it.each([
    ["2026-03-28", "08:00", "Europe/London", "2026-03-28T08:00:00.000Z"], // GMT
    ["2026-03-29", "08:00", "Europe/London", "2026-03-29T07:00:00.000Z"], // BST starts that night
    ["2026-10-31", "08:00", "America/New_York", "2026-10-31T12:00:00.000Z"], // EDT
    ["2026-11-01", "08:00", "America/New_York", "2026-11-01T13:00:00.000Z"], // EST from that morning
    ["2026-11-07", "08:00", "Asia/Kolkata", "2026-11-07T02:30:00.000Z"],
    ["2026-11-07", "00:15", "Pacific/Auckland", "2026-11-06T11:15:00.000Z"],
  ])("%s %s in %s is %s", (date, time, tz, iso) => {
    expect(zonedToUtc(date, time, tz).toISOString()).toBe(iso);
    expect(localDateIn(new Date(iso), tz)).toBe(date);
  });

  it("respects weekdays, start and end dates", () => {
    const med = { id: "m", schedule: { times: ["20:00", "08:00"], days: [1, 3, 5] }, startDate: "2026-11-02", endDate: "2026-11-30" };
    expect(dosesOn([med], "2026-11-02", "UTC").map((d) => d.time)).toEqual(["08:00", "20:00"]); // Monday
    expect(dosesOn([med], "2026-11-03", "UTC")).toHaveLength(0); // Tuesday
    expect(dosesOn([med], "2026-10-30", "UTC")).toHaveLength(0); // before start
    expect(dosesOn([med], "2026-12-02", "UTC")).toHaveLength(0); // after end
  });
});

async function setup(email: string, ip: string) {
  const cookie = await signIn(email, ip);
  await call("/api/v1/patients/me/profile", { cookie, method: "PUT", body: { timezone: "Asia/Kolkata" } });
  const res = await call("/api/v1/patients/me/medications", {
    cookie,
    body: { name: "Metoprolol", dose: "25 mg", schedule: { times: ["08:00", "20:00"] }, startDate: "2026-01-01" },
  });
  const { medication } = (await res.json()) as { medication: { id: string } };
  return { cookie, medId: medication.id, uid: await userId(cookie) };
}

describe("doses API", () => {
  it("lists a day's doses, marks one taken and rejects doses not on the schedule", async () => {
    const { cookie, medId } = await setup("doses-day@example.com", "198.51.100.60");
    const day = (await (await call("/api/v1/patients/me/doses?date=2026-11-07", { cookie })).json()) as {
      timezone: string;
      items: { medicationId: string; time: string; scheduledAt: string; status: string }[];
    };
    expect(day.timezone).toBe("Asia/Kolkata");
    expect(day.items.map((d) => d.time)).toEqual(["08:00", "20:00"]);
    expect(day.items[0]!.scheduledAt).toBe("2026-11-07T02:30:00.000Z");

    const mark = await call("/api/v1/patients/me/doses", { cookie, body: { medicationId: medId, scheduledAt: day.items[0]!.scheduledAt, status: "taken" } });
    expect(mark.status).toBe(200);
    const again = (await (await call("/api/v1/patients/me/doses?date=2026-11-07", { cookie })).json()) as { items: { status: string }[] };
    expect(again.items[0]!.status).toBe("taken");

    const wrong = await call("/api/v1/patients/me/doses", { cookie, body: { medicationId: medId, scheduledAt: "2026-11-07T03:00:00.000Z", status: "taken" } });
    expect(wrong.status).toBe(400);
    const future = await call("/api/v1/patients/me/doses", { cookie, body: { medicationId: medId, scheduledAt: "2030-01-01T02:30:00.000Z", status: "taken" } });
    expect(future.status).toBe(400);
  });

  it("doesn't let another account mark or read someone's doses", async () => {
    const { medId, uid } = await setup("doses-owner@example.com", "198.51.100.61");
    const other = await signIn("doses-other@example.com", "198.51.100.62");
    expect((await call(`/api/v1/patients/${uid}/doses`, { cookie: other })).status).toBe(403);
    const res = await call("/api/v1/patients/me/doses", { cookie: other, body: { medicationId: medId, scheduledAt: "2026-11-07T02:30:00.000Z", status: "taken" } });
    expect(res.status).toBe(404);
  });

  it("computes adherence from taken, skipped and missed doses", async () => {
    const { cookie, medId } = await setup("doses-adherence@example.com", "198.51.100.63");
    const yesterday = new Date(Date.now() - 86400000);
    const date = localDateIn(yesterday, "Asia/Kolkata");
    const [morning, evening] = dosesOn([{ id: medId, schedule: { times: ["08:00", "20:00"] }, startDate: "2026-01-01", endDate: null }], date, "Asia/Kolkata");
    await call("/api/v1/patients/me/doses", { cookie, body: { medicationId: medId, scheduledAt: morning!.scheduledAt.toISOString(), status: "taken" } });
    await call("/api/v1/patients/me/doses", { cookie, body: { medicationId: medId, scheduledAt: evening!.scheduledAt.toISOString(), status: "skipped" } });
    const res = (await (await call("/api/v1/patients/me/adherence?days=2", { cookie })).json()) as {
      days: { date: string; taken: number; skipped: number; due: number }[];
      percent: number;
    };
    const y = res.days.find((d) => d.date === date)!;
    expect(y).toMatchObject({ taken: 1, skipped: 1, due: 2 });
    expect(res.percent).toBeLessThanOrEqual(50);
  });
});

describe("dose jobs", () => {
  it("creates upcoming doses, queues one reminder per patient and marks old doses missed", async () => {
    const { cookie, uid } = await setup("doses-cron@example.com", "198.51.100.64");
    await call("/api/v1/push/subscribe", {
      cookie,
      body: { endpoint: "https://push.example.com/send/abc", keys: { p256dh: bytesToB64url(new Uint8Array(65).fill(4)), auth: "AAAAAAAAAAAAAAAAAAAAAA" } },
    });

    const today = localDateIn(new Date(), "Asia/Kolkata");
    const morning = zonedToUtc(today, "08:00", "Asia/Kolkata");
    await generateUpcomingDoses(db, morning);
    const rows = await db.select().from(doseEvents).where(eq(doseEvents.userId, uid));
    expect(rows.length).toBeGreaterThanOrEqual(4); // today and tomorrow, two times each

    expect(await sendDoseReminders(db, new Date(morning.getTime() + 60_000))).toBeGreaterThanOrEqual(1);
    expect(await sendDoseReminders(db, new Date(morning.getTime() + 120_000))).toBe(0); // not twice
    const pushes = await db.select().from(outbox).where(eq(outbox.kind, "reminder:dose"));
    expect(pushes.some((p) => (p.payload as { title: string }).title === "Time for Metoprolol")).toBe(true);

    const missed = await markMissed(db, new Date(morning.getTime() + 3 * 3600_000));
    expect(missed.some((m) => m.userId === uid)).toBe(true);
  });
});

describe("web push encryption (RFC 8291)", () => {
  it("produces a body the subscriber can decrypt", async () => {
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    const uaPublic = new Uint8Array((await crypto.subtle.exportKey("raw", ua.publicKey)) as ArrayBuffer);
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const message = new TextEncoder().encode(JSON.stringify({ title: "Time for Aspirin" }));
    const body = await encryptPayload({ endpoint: "https://x", keys: { p256dh: bytesToB64url(uaPublic), auth: bytesToB64url(auth) } }, message);

    // Decrypt the way a browser would.
    const salt = body.slice(0, 16);
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    const idlen = body[20]!;
    const asPublic = body.slice(21, 21 + idlen);
    const cipher = body.slice(21 + idlen);
    const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
    const hkdf = async (s: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, n: number) =>
      new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: s, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), n * 8));
    const enc = new TextEncoder();
    const keyInfo = new Uint8Array([...enc.encode("WebPush: info\0"), ...uaPublic, ...asPublic]);
    const ikm = await hkdf(auth, secret, keyInfo, 32);
    const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
    const plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), cipher),
    );
    expect(plain[plain.length - 1]).toBe(2); // last-record delimiter
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe('{"title":"Time for Aspirin"}');
    expect(b64urlToBytes(bytesToB64url(uaPublic))).toEqual(uaPublic);
  });
});
