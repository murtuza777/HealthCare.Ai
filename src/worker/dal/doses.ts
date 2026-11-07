// Scheduled doses, marking them taken or skipped, and adherence.
// A dose is identified by (medication, scheduled instant); dose_events stores what happened.
import { and, eq, gte, inArray, isNull, lt, lte } from "drizzle-orm";
import {
  addDays,
  adherencePercent,
  dosesOn,
  EARLY_WINDOW_MS,
  effectiveStatus,
  localDateIn,
  MISSED_AFTER_MS,
  zonedToUtc,
  type DoseAction,
  type DoseStatus,
} from "../../shared/doses";
import type { Db } from "../db/client";
import { doseEvents, medications, profiles } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

type Med = typeof medications.$inferSelect;

export class DoseError extends Error {}

async function timezoneOf(db: Db, patientId: string): Promise<string> {
  const row = await db.select({ tz: profiles.timezone }).from(profiles).where(eq(profiles.userId, patientId)).get();
  return row?.tz || "UTC";
}

async function activeMeds(db: Db, patientId: string): Promise<Med[]> {
  return db.select().from(medications).where(and(eq(medications.userId, patientId), eq(medications.active, true)));
}

async function eventsBetween(db: Db, patientId: string, from: Date, to: Date) {
  return db
    .select()
    .from(doseEvents)
    .where(and(eq(doseEvents.userId, patientId), gte(doseEvents.scheduledAt, from), lt(doseEvents.scheduledAt, to)));
}

const key = (medicationId: string, at: Date) => `${medicationId}@${at.getTime()}`;

export type DoseItem = {
  medicationId: string;
  name: string;
  dose: string;
  instructions: string | null;
  time: string;
  scheduledAt: Date;
  status: DoseStatus;
  actedAt: Date | null;
};

/** Every dose scheduled on one local date (today by default), with what happened to each. */
export async function dosesForDay(db: Db, actor: Actor, patientId: string, opts: { date?: string; now?: Date } = {}) {
  await assertAccess(db, actor, patientId, "meds");
  const now = opts.now ?? new Date();
  const tz = await timezoneOf(db, patientId);
  const date = opts.date ?? localDateIn(now, tz);
  const meds = await activeMeds(db, patientId);
  const from = zonedToUtc(date, "00:00", tz);
  const to = zonedToUtc(addDays(date, 1), "00:00", tz);
  const events = new Map((await eventsBetween(db, patientId, from, to)).map((e) => [key(e.medicationId, e.scheduledAt), e]));
  const items: DoseItem[] = dosesOn(meds, date, tz).map(({ medication: m, scheduledAt, time }) => {
    const e = events.get(key(m.id, scheduledAt));
    return {
      medicationId: m.id,
      name: m.name,
      dose: m.dose,
      instructions: m.instructions,
      time,
      scheduledAt,
      status: effectiveStatus(e?.status, scheduledAt, now),
      actedAt: e?.actedAt ?? null,
    };
  });
  return { date, timezone: tz, items };
}

/** Mark a scheduled dose taken or skipped (or back to not marked). */
export async function markDose(db: Db, actor: Actor, patientId: string, action: DoseAction, now = new Date()) {
  await assertAccess(db, actor, patientId, "owner");
  const med = await db
    .select()
    .from(medications)
    .where(and(eq(medications.id, action.medicationId), eq(medications.userId, patientId)))
    .get();
  if (!med) return null;
  const tz = await timezoneOf(db, patientId);
  const date = localDateIn(action.scheduledAt, tz);
  const scheduled = dosesOn([med], date, tz).some((d) => d.scheduledAt.getTime() === action.scheduledAt.getTime());
  if (!scheduled) throw new DoseError("That dose isn't on this medicine's schedule.");
  if (action.scheduledAt.getTime() - now.getTime() > EARLY_WINDOW_MS) throw new DoseError("That dose is too far in the future to mark.");

  const values = { status: action.status, actedAt: action.status === "pending" ? null : now };
  const [row] = await db
    .insert(doseEvents)
    .values({ medicationId: med.id, userId: patientId, scheduledAt: action.scheduledAt, ...values })
    .onConflictDoUpdate({ target: [doseEvents.medicationId, doseEvents.scheduledAt], set: values })
    .returning();
  return row!;
}

/** Per-day counts for the last `days` local dates (today included) and the overall percentage. */
export async function adherence(db: Db, actor: Actor, patientId: string, days = 7, now = new Date()) {
  await assertAccess(db, actor, patientId, "meds");
  const tz = await timezoneOf(db, patientId);
  const today = localDateIn(now, tz);
  const first = addDays(today, -(days - 1));
  const meds = await db.select().from(medications).where(eq(medications.userId, patientId));
  const events = new Map(
    (await eventsBetween(db, patientId, zonedToUtc(first, "00:00", tz), zonedToUtc(addDays(today, 1), "00:00", tz))).map((e) => [key(e.medicationId, e.scheduledAt), e]),
  );
  const summary = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(first, i);
    // Stopped medicines still count on the days they were active (until their end date).
    const doses = dosesOn(meds.filter((m) => m.active || (m.endDate && m.endDate >= date)), date, tz);
    let taken = 0, skipped = 0, missed = 0, pending = 0;
    for (const d of doses) {
      const s = effectiveStatus(events.get(key(d.medication.id, d.scheduledAt))?.status, d.scheduledAt, now);
      if (s === "taken") taken++;
      else if (s === "skipped") skipped++;
      else if (s === "missed") missed++;
      else pending++;
    }
    summary.push({ date, scheduled: doses.length, taken, skipped, missed, pending, due: taken + skipped + missed });
  }
  return { timezone: tz, days: summary, percent: adherencePercent(summary) };
}

// ---------------------------------------------------------------------------
// Background jobs (run by the cron; small batches keep each run in the CPU budget)
// ---------------------------------------------------------------------------

/** Create dose rows for today and tomorrow (each patient's local dates) so reminders can find them. */
export async function generateUpcomingDoses(db: Db, now = new Date(), batch = 200) {
  const rows = await db
    .select({ med: medications, tz: profiles.timezone })
    .from(medications)
    .leftJoin(profiles, eq(profiles.userId, medications.userId))
    .where(eq(medications.active, true))
    .limit(batch);
  const values: (typeof doseEvents.$inferInsert)[] = [];
  for (const { med, tz } of rows) {
    const zone = tz || "UTC";
    const today = localDateIn(now, zone);
    for (const date of [today, addDays(today, 1)]) {
      for (const d of dosesOn([med], date, zone)) values.push({ medicationId: med.id, userId: med.userId, scheduledAt: d.scheduledAt });
    }
  }
  // D1 limits bound parameters per statement, so insert in chunks.
  for (let i = 0; i < values.length; i += 20) {
    await db.insert(doseEvents).values(values.slice(i, i + 20)).onConflictDoNothing();
  }
  return values.length;
}

/** Doses whose time has come and that haven't been reminded about yet. */
export async function dueForReminder(db: Db, now = new Date(), batch = 50) {
  return db
    .select({ event: doseEvents, name: medications.name, dose: medications.dose })
    .from(doseEvents)
    .innerJoin(medications, eq(medications.id, doseEvents.medicationId))
    .where(
      and(
        eq(doseEvents.status, "pending"),
        isNull(doseEvents.notifiedAt),
        lte(doseEvents.scheduledAt, now),
        gte(doseEvents.scheduledAt, new Date(now.getTime() - 30 * 60 * 1000)), // don't remind about old doses
        eq(medications.active, true),
      ),
    )
    .limit(batch);
}

export async function markReminded(db: Db, ids: string[], now = new Date()) {
  if (ids.length) await db.update(doseEvents).set({ notifiedAt: now }).where(inArray(doseEvents.id, ids));
}

/** Pending doses past their window become missed. Returns the newly missed rows. */
export async function markMissed(db: Db, now = new Date(), batch = 100) {
  const cutoff = new Date(now.getTime() - MISSED_AFTER_MS);
  const rows = await db
    .select({ id: doseEvents.id, userId: doseEvents.userId, medicationId: doseEvents.medicationId, scheduledAt: doseEvents.scheduledAt })
    .from(doseEvents)
    .where(and(eq(doseEvents.status, "pending"), lt(doseEvents.scheduledAt, cutoff)))
    .limit(batch);
  if (rows.length) await db.update(doseEvents).set({ status: "missed" }).where(inArray(doseEvents.id, rows.map((r) => r.id)));
  return rows;
}

