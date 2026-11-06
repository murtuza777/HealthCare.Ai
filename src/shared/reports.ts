import { z } from "zod";

// Categories carried over from the legacy app.
export const REPORT_TYPES = ["General", "Cardiology", "Radiology", "Laboratory", "Pathology", "Prescription", "Other"] as const;

export const MAX_REPORT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const reportMetaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: z.enum(REPORT_TYPES),
  reportDate: z.iso.date().optional(),
  doctor: z.string().trim().max(100).optional(),
  facility: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type ReportMeta = z.infer<typeof reportMetaSchema>;

/**
 * Detect the real file type from its first bytes. The declared Content-Type is not trusted:
 * a renamed HTML or script file must never be stored as a "PDF".
 */
export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  const at = (i: number, ...sig: number[]) => sig.every((b, j) => bytes[i + j] === b);
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp"; // RIFF....WEBP
  return null;
}

// --- Sharing ---------------------------------------------------------------

export const SHARE_DURATIONS = { "1h": 60 * 60, "24h": 24 * 60 * 60, "7d": 7 * 24 * 60 * 60 } as const;

export const shareInputSchema = z.object({
  reportIds: z.array(z.string().min(1)).min(1, "Pick at least one report").max(20),
  expiresIn: z.enum(Object.keys(SHARE_DURATIONS) as [keyof typeof SHARE_DURATIONS, ...(keyof typeof SHARE_DURATIONS)[]]),
  includeVitals: z.boolean().default(false),
});
export type ShareInput = z.input<typeof shareInputSchema>;
