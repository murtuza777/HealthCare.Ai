import { z } from "zod";

// Appointments and one-off reminders the patient adds themself. An appointment notifies the
// day before and again two hours before; a plain reminder notifies once, at its time.

export const REMINDER_KINDS = ["appointment", "custom"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const reminderInputSchema = z.object({
  kind: z.enum(REMINDER_KINDS),
  title: z.string().trim().min(1, "Say what it's for").max(120),
  dueAt: z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, "Choose a time in the future"),
});
export type ReminderInput = z.infer<typeof reminderInputSchema>;

const HOUR = 3_600_000;
export const DAY_BEFORE_MS = 24 * HOUR;
export const SHORTLY_BEFORE_MS = 2 * HOUR;

/** When to notify next, given what time it is now. Null when there is nothing left to send. */
export function nextNotification(kind: ReminderKind, dueAt: Date, now: Date): Date | null {
  if (kind === "custom") return dueAt.getTime() > now.getTime() ? dueAt : null;
  for (const lead of [DAY_BEFORE_MS, SHORTLY_BEFORE_MS]) {
    const at = new Date(dueAt.getTime() - lead);
    if (at.getTime() > now.getTime()) return at;
  }
  return null;
}

/** "Tomorrow at 10:30", "Today at 10:30" or "Fri 14 Nov at 10:30", in the patient's time zone. */
export function whenText(dueAt: Date, now: Date, timezone: string): string {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: timezone });
  const time = dueAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timezone });
  const tomorrow = new Date(now.getTime() + 24 * HOUR);
  if (day(dueAt) === day(now)) return `Today at ${time}`;
  if (day(dueAt) === day(tomorrow)) return `Tomorrow at ${time}`;
  return `${dueAt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: timezone })} at ${time}`;
}
