// Daily review: gathers what the insight rules need for one patient. Runs from the cron as the
// system (no signed-in actor), so it only ever reads a single patient's own rows by id.
import { and, desc, eq, gte, max, sql } from "drizzle-orm";
import { localDateIn, tzOffset } from "../../shared/doses";
import type { InsightInput } from "../../shared/insights";
import type { Db } from "../db/client";
import { profiles, symptoms, vitals } from "../db/schema";
import { adherence } from "./doses";

const DAY = 86_400_000;
/** The local hour at which each patient's record is reviewed. */
export const REVIEW_HOUR = 9;
const PAGE = 50;

/**
 * Patients whose local time is in the review hour. The cron runs every minute, so minute N of
 * the hour handles page N: up to 60 pages of 50 patients, without keeping any cursor.
 */
export async function patientsDueForReview(db: Db, now: Date): Promise<{ userId: string; timezone: string }[]> {
  const rows = await db
    .select({ userId: profiles.userId, timezone: profiles.timezone })
    .from(profiles)
    .orderBy(profiles.userId)
    .limit(PAGE)
    .offset(now.getUTCMinutes() * PAGE);
  return rows.filter((r) => {
    try {
      const local = new Date(now.getTime() + tzOffset(now, r.timezone || "UTC"));
      return local.getUTCHours() === REVIEW_HOUR;
    } catch {
      return false; // unknown time zone
    }
  });
}

export async function insightInputFor(db: Db, patientId: string, now: Date): Promise<InsightInput> {
  const since = new Date(now.getTime() - 15 * DAY);
  const actor = { userId: patientId };
  const [recent, totals, lastSymptom, week] = await Promise.all([
    db
      .select({ type: vitals.type, value: vitals.value, value2: vitals.value2, measuredAt: vitals.measuredAt })
      .from(vitals)
      .where(and(eq(vitals.userId, patientId), gte(vitals.measuredAt, since)))
      .orderBy(desc(vitals.measuredAt))
      .limit(400),
    db.select({ count: sql<number>`count(*)`, last: max(vitals.measuredAt) }).from(vitals).where(eq(vitals.userId, patientId)).get(),
    db.select({ last: max(symptoms.occurredAt) }).from(symptoms).where(eq(symptoms.userId, patientId)).get(),
    adherence(db, actor, patientId, 7, now),
  ]);
  const of = (type: string) => recent.filter((r) => r.type === type);
  // Today's doses may simply not be due yet, so only finished days count.
  const today = localDateIn(now, week.timezone);
  const finished = week.days.filter((d) => d.date !== today);
  const sum = (k: "due" | "missed" | "skipped") => finished.reduce((a, d) => a + d[k], 0);
  const lastVital = totals?.last ? +new Date(totals.last) : 0;
  const lastSym = lastSymptom?.last ? +new Date(lastSymptom.last) : 0;
  const last = Math.max(lastVital, lastSym);
  return {
    now,
    bloodPressure: of("blood_pressure"),
    heartRate: of("heart_rate"),
    weight: of("weight"),
    doses: { due: sum("due"), missed: sum("missed"), skipped: sum("skipped") },
    lastReadingAt: last ? new Date(last) : null,
    totalReadings: Number(totals?.count ?? 0),
  };
}
