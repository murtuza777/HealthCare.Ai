import { z } from "zod";

const list = z.array(z.string().trim().min(1).max(100)).max(50);

export const profileInputSchema = z
  .object({
    dateOfBirth: z.iso.date().nullable(),
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
    lastHeartAttackAt: z.iso.date().nullable(),
    emergencyContact: z
      .object({ name: z.string().min(1).max(100), phone: z.string().min(3).max(30), relation: z.string().max(50).optional() })
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
