import { z } from "zod";

export const CARE_PERMISSION_LIST = ["vitals", "meds", "reports", "alerts"] as const;
export type CarePermissionName = (typeof CARE_PERMISSION_LIST)[number];

export const CARE_PERMISSION_LABELS: Record<CarePermissionName, { label: string; detail: string }> = {
  vitals: { label: "Readings and symptoms", detail: "See your readings, trends and symptoms." },
  meds: { label: "Medicines", detail: "See your medicines and whether doses were taken." },
  reports: { label: "Reports", detail: "See and download your uploaded reports." },
  alerts: { label: "Alerts", detail: "Be notified about emergency-range readings, urgent symptoms and missed doses." },
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
