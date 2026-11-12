import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const medicationInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    dose: z.string().trim().min(1).max(50),
    form: z.string().trim().max(50).optional(),
    instructions: z.string().trim().max(500).optional(),
    schedule: z.object({
      // The same time or day entered twice is one dose, not two.
      times: z
        .array(time)
        .min(1, "Add at least one time")
        .max(24)
        .transform((t) => [...new Set(t)].sort())
        .refine((t) => t.length <= 8, "At most 8 times a day"),
      days: z
        .array(z.number().int().min(0).max(6))
        .max(14)
        .transform((d) => [...new Set(d)].sort())
        .optional(), // omitted = every day
    }),
    startDate: z.iso.date(),
    endDate: z.iso.date().nullable().optional(),
  })
  .refine((m) => !m.endDate || m.endDate >= m.startDate, { path: ["endDate"], message: "End date is before the start date" });

export type MedicationInput = z.infer<typeof medicationInputSchema>;

export const medicationUpdateSchema = z.object({ active: z.boolean() });
