// Appointments and one-off reminders. Only the patient manages them; caretakers who can see
// medicines can see what is coming up.
import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { nextNotification, type ReminderInput } from "../../shared/reminders";
import type { Db } from "../db/client";
import { profiles, reminders } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Reminder = typeof reminders.$inferSelect;

const MAX_UPCOMING = 50;

/** Upcoming reminders, soonest first (ones up to two hours past still show, as "now"). */
export async function listReminders(db: Db, actor: Actor, patientId: string, now = new Date()): Promise<Reminder[]> {
  await assertAccess(db, actor, patientId, "meds");
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, patientId), gte(reminders.dueAt, new Date(now.getTime() - 2 * 3_600_000))))
    .orderBy(asc(reminders.dueAt))
    .limit(MAX_UPCOMING);
}

export class ReminderError extends Error {}

export async function addReminder(db: Db, actor: Actor, patientId: string, input: ReminderInput, now = new Date()): Promise<Reminder> {
  await assertAccess(db, actor, patientId, "owner");
  if ((await listReminders(db, actor, patientId, now)).length >= MAX_UPCOMING) throw new ReminderError("You have a lot of reminders coming up. Remove one before adding another.");
  const [row] = await db
    .insert(reminders)
    .values({ userId: patientId, kind: input.kind, title: input.title, dueAt: input.dueAt, nextRunAt: nextNotification(input.kind, input.dueAt, now) })
    .returning();
  return row!;
}

export async function deleteReminder(db: Db, actor: Actor, patientId: string, id: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  const rows = await db
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, patientId)))
    .returning({ id: reminders.id });
  return rows.length > 0;
}

// --- Background job ---------------------------------------------------------

/** Reminders whose next notification time has come, with the patient's time zone. */
export async function remindersToNotify(db: Db, now = new Date(), batch = 50) {
  return db
    .select({ reminder: reminders, timezone: profiles.timezone })
    .from(reminders)
    .leftJoin(profiles, eq(profiles.userId, reminders.userId))
    .where(and(isNotNull(reminders.nextRunAt), lte(reminders.nextRunAt, now)))
    .limit(batch);
}

/** Record that a notification went out and schedule the next one (or none). */
export async function markReminderNotified(db: Db, reminder: Reminder, now = new Date()) {
  await db
    .update(reminders)
    .set({ notifiedAt: now, nextRunAt: nextNotification(reminder.kind, reminder.dueAt, now) })
    .where(eq(reminders.id, reminder.id));
}
