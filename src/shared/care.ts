import { z } from "zod";

export const CARE_PERMISSION_LIST = ["vitals", "meds", "reports", "alerts"] as const;
export type CarePermissionName = (typeof CARE_PERMISSION_LIST)[number];

export const CARE_PERMISSION_LABELS: Record<CarePermissionName, { label: string; detail: string }> = {
  vitals: { label: "Readings and symptoms", detail: "See your readings, trends and symptoms." },
  meds: { label: "Medicines", detail: "See your medicines and whether doses were taken." },
  reports: { label: "Reports", detail: "See and download your uploaded reports." },
  alerts: { label: "Alerts", detail: "Be notified about emergency-range readings, urgent symptoms, missed doses and worrying trends." },
};

/** The same permissions, worded for the caretaker reading an invitation. */
export const CARE_PERMISSION_FOR_CARETAKER: Record<CarePermissionName, string> = {
  vitals: "See their readings, trends and symptoms.",
  meds: "See their medicines and whether doses were taken.",
  reports: "See and download their uploaded reports.",
  alerts: "Be notified about emergency-range readings, urgent symptoms, missed doses and worrying trends.",
};

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const permissions = z.array(z.enum(CARE_PERMISSION_LIST)).min(1, "Choose at least one thing to share").max(4);

export const careInviteSchema = z.object({
  email: z.email().max(254).transform((e) => e.trim().toLowerCase()),
  relation: z.string().trim().max(50).optional(),
  permissions,
});
export type CareInvite = z.infer<typeof careInviteSchema>;

export const carePermissionsSchema = z.object({ permissions });
export const careAcceptSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/) });

// --- Quiet hours (chosen by the caretaker) ---------------------------------
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 22:00");
export const quietHoursSchema = z.object({ quietHours: z.object({ from: hhmm, to: hhmm }).nullable() });
export type QuietHours = { from: string; to: string };

/**
 * Is `now` inside the caretaker's quiet hours, in their own time zone? A range may cross
 * midnight (22:00 to 07:00). Emergencies ignore quiet hours; the caller decides that.
 */
export function inQuietHours(q: QuietHours | null | undefined, now: Date, timezone: string | null | undefined): boolean {
  if (!q || q.from === q.to) return false;
  let local: string;
  try {
    local = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone || "UTC" });
  } catch {
    local = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  }
  return q.from < q.to ? local >= q.from && local < q.to : local >= q.from || local < q.to;
}
