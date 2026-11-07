import { z } from "zod";

// Medicine schedules are stored as local times ("08:00") plus optional weekdays. Doses are
// expanded in the patient's own timezone, so 08:00 stays 08:00 across daylight-saving changes.

export type MedSchedule = { times: string[]; days?: number[] };
export type DoseStatus = "pending" | "taken" | "skipped" | "missed";

/** A dose counts as missed this long after its time if nobody marked it. */
export const MISSED_AFTER_MS = 2 * 60 * 60 * 1000;
/** Doses can be marked from this long before their time. */
export const EARLY_WINDOW_MS = 12 * 60 * 60 * 1000;

export const doseActionSchema = z.object({
  medicationId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  status: z.enum(["taken", "skipped", "pending"]),
});
export type DoseAction = z.infer<typeof doseActionSchema>;

const dtf = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = dtf.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    dtf.set(tz, f);
  }
  return f;
}

/** Offset of `tz` from UTC at `instant`, in ms (e.g. +05:30 → 19800000). */
export function tzOffset(instant: Date, tz: string): number {
  const p = Object.fromEntries(formatter(tz).formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-11-07" + "08:00" in `tz` → the UTC instant. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let at = guess - tzOffset(new Date(guess), tz);
  at = guess - tzOffset(new Date(at), tz); // second pass settles DST boundaries
  return new Date(at);
}

/** The local calendar date ("YYYY-MM-DD") of an instant in `tz`. */
export function localDateIn(instant: Date, tz: string): string {
  const p = Object.fromEntries(formatter(tz).formatToParts(instant).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const weekday = (date: string) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

type Expandable = { id: string; schedule: MedSchedule; startDate: string; endDate: string | null };

/** Every scheduled dose of these medicines on one local date. */
export function dosesOn<M extends Expandable>(meds: M[], date: string, tz: string): { medication: M; scheduledAt: Date; time: string }[] {
  const out: { medication: M; scheduledAt: Date; time: string }[] = [];
  const dow = weekday(date);
  for (const m of meds) {
    if (date < m.startDate || (m.endDate && date > m.endDate)) continue;
    if (m.schedule.days?.length && !m.schedule.days.includes(dow)) continue;
    for (const time of [...m.schedule.times].sort()) out.push({ medication: m, scheduledAt: zonedToUtc(date, time, tz), time });
  }
  return out.sort((a, b) => +a.scheduledAt - +b.scheduledAt);
}

/** Status shown to people: an unmarked dose becomes missed once its window has passed. */
export function effectiveStatus(stored: DoseStatus | undefined, scheduledAt: Date, now = new Date()): DoseStatus {
  if (stored && stored !== "pending") return stored;
  return now.getTime() - scheduledAt.getTime() > MISSED_AFTER_MS ? "missed" : "pending";
}

/** Adherence over the given day summaries: taken / (doses whose window has passed or were acted on). */
export function adherencePercent(days: { taken: number; due: number }[]): number | null {
  const due = days.reduce((a, d) => a + d.due, 0);
  if (!due) return null;
  return Math.round((days.reduce((a, d) => a + d.taken, 0) / due) * 100);
}
