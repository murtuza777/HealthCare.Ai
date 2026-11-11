import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { nextNotification, whenText } from "../src/shared/reminders";
import { buildPatientContext } from "../src/worker/ai/context";
import { outbox, pushSubscriptions } from "../src/worker/db/schema";
import { sendReminders } from "../src/worker/jobs/reminders";
import { call, db, signIn, userId } from "./helpers";

const HOUR = 3_600_000;

describe("reminder timing", () => {
  const now = new Date("2026-11-10T09:00:00Z");
  it("notifies an appointment the day before, then two hours before, then stops", () => {
    const due = new Date("2026-11-13T10:00:00Z");
    expect(nextNotification("appointment", due, now)).toEqual(new Date("2026-11-12T10:00:00Z"));
    expect(nextNotification("appointment", due, new Date("2026-11-12T10:00:30Z"))).toEqual(new Date("2026-11-13T08:00:00Z"));
    expect(nextNotification("appointment", due, new Date("2026-11-13T08:00:30Z"))).toBeNull();
    // Booked for later today: only the two-hour reminder is left.
    expect(nextNotification("appointment", new Date("2026-11-10T15:00:00Z"), now)).toEqual(new Date("2026-11-10T13:00:00Z"));
    expect(nextNotification("appointment", new Date("2026-11-10T10:00:00Z"), now)).toBeNull();
  });
  it("notifies a plain reminder once, at its time", () => {
    const due = new Date("2026-11-11T07:00:00Z");
    expect(nextNotification("custom", due, now)).toEqual(due);
    expect(nextNotification("custom", due, new Date(due.getTime() + 1000))).toBeNull();
  });
  it("words the time in the patient's time zone", () => {
    expect(whenText(new Date("2026-11-10T15:00:00Z"), now, "UTC")).toBe("Today at 15:00");
    expect(whenText(new Date("2026-11-11T05:00:00Z"), now, "Asia/Kolkata")).toBe("Tomorrow at 10:30");
    expect(whenText(new Date("2026-11-20T10:00:00Z"), now, "UTC")).toBe("Fri 20 Nov at 10:00");
  });
});

describe("reminders API and job", () => {
  it("adds, lists, reminds twice for an appointment, and removes", async () => {
    const cookie = await signIn("remind-a@example.com", "198.51.100.150");
    const id = await userId(cookie);
    await db.insert(pushSubscriptions).values({ userId: id, endpoint: "https://push.example/remind-a", keys: { p256dh: "x", auth: "y" } });
    const now = new Date();
    const due = new Date(now.getTime() + 30 * HOUR);

    expect((await call("/api/v1/patients/me/reminders", { cookie, body: { kind: "appointment", title: "", dueAt: due.toISOString() } })).status).toBe(400);
    expect((await call("/api/v1/patients/me/reminders", { cookie, body: { kind: "appointment", title: "Old", dueAt: new Date(now.getTime() - HOUR).toISOString() } })).status).toBe(400);
    const made = await call("/api/v1/patients/me/reminders", { cookie, body: { kind: "appointment", title: "Dr Mehta, cardiology", dueAt: due.toISOString() } });
    expect(made.status).toBe(201);
    const rid = ((await made.json()) as { reminder: { id: string } }).reminder.id;

    const list = (await (await call("/api/v1/patients/me/reminders", { cookie })).json()) as { items: { title: string }[] };
    expect(list.items.map((r) => r.title)).toEqual(["Dr Mehta, cardiology"]);

    const pushes = async () => (await db.select().from(outbox).where(and(eq(outbox.channel, "push"), eq(outbox.kind, "reminder:appointment")))).filter((o) => String((o.payload as { tag?: string }).tag) === `reminder-${rid}`);
    expect(await sendReminders(db, now)).toBe(0); // nothing due yet
    expect(await sendReminders(db, new Date(due.getTime() - 24 * HOUR + 60_000))).toBe(1);
    expect(await sendReminders(db, new Date(due.getTime() - 24 * HOUR + 120_000))).toBe(0); // not twice
    expect(await sendReminders(db, new Date(due.getTime() - 2 * HOUR + 60_000))).toBe(1);
    expect(await sendReminders(db, new Date(due.getTime() + 60_000))).toBe(0);
    const sent = await pushes();
    expect(sent).toHaveLength(2);
    expect((sent[0]!.payload as { title: string }).title).toBe("Appointment: Dr Mehta, cardiology");

    const ctx = await buildPatientContext(db, { userId: id }, now);
    expect(ctx.text).toContain("Upcoming appointments:\n- Dr Mehta, cardiology:");

    const other = await signIn("remind-b@example.com", "198.51.100.151");
    expect((await call(`/api/v1/patients/${id}/reminders`, { cookie: other })).status).toBe(403);
    expect((await call(`/api/v1/patients/me/reminders/${rid}`, { cookie: other, method: "DELETE" })).status).toBe(404);
    expect((await call(`/api/v1/patients/me/reminders/${rid}`, { cookie, method: "DELETE" })).status).toBe(200);
  });

  it("doesn't send a reminder found long after its time", async () => {
    const cookie = await signIn("remind-c@example.com", "198.51.100.152");
    const id = await userId(cookie);
    await db.insert(pushSubscriptions).values({ userId: id, endpoint: "https://push.example/remind-c", keys: { p256dh: "x", auth: "y" } });
    const now = new Date();
    await call("/api/v1/patients/me/reminders", { cookie, body: { kind: "custom", title: "Book a blood test", dueAt: new Date(now.getTime() + HOUR).toISOString() } });
    expect(await sendReminders(db, new Date(now.getTime() + 10 * HOUR))).toBe(0);
    expect(await sendReminders(db, new Date(now.getTime() + 11 * HOUR))).toBe(0);
  });
});
