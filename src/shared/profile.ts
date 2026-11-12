import { z } from "zod";

const list = z.array(z.string().trim().min(1).max(100)).max(50);

/** A calendar date that has already happened, and not absurdly long ago. */
const pastDate = (message: string) =>
  z.iso.date().refine((d) => d <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) && d >= "1900-01-01", message);
// Digits with the usual separators; at least 5 digits so a tap can actually dial it.
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^\+?[\d\s().-]+$/, "Use digits, spaces and + only")
  .refine((p) => p.replace(/\D/g, "").length >= 5, "That phone number is too short");

export const profileInputSchema = z
  .object({
    dateOfBirth: pastDate("Date of birth can't be in the future").nullable(),
    sex: z.enum(["female", "male", "other", "unspecified"]).nullable(),
    heightCm: z.number().min(40).max(260).nullable(),
    country: z.string().length(2).toUpperCase().nullable(),
    timezone: z.string().min(1).max(64),
    units: z.enum(["metric", "us"]),
    conditions: list,
    allergies: list,
    familyHistory: list,
    lifestyle: z
      .object({
        smoker: z.boolean(),
        alcohol: z.enum(["none", "light", "moderate", "heavy"]),
        exerciseDaysPerWeek: z.number().int().min(0).max(7),
        diet: z.string().max(200).optional(),
        stressLevel: z.number().int().min(1).max(10).optional(),
      })
      .nullable(),
    hadHeartAttack: z.boolean(),
    lastHeartAttackAt: pastDate("That date can't be in the future").nullable(),
    emergencyContact: z
      .object({ name: z.string().trim().min(1).max(100), phone, relation: z.string().trim().max(50).optional() })
      .nullable(),
  })
  .partial()
  .refine((p) => !p.timezone || isValidTimezone(p.timezone), { path: ["timezone"], message: "Unknown timezone" });

export type ProfileInput = z.infer<typeof profileInputSchema>;

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
