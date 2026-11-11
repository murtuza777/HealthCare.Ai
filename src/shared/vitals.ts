// Vital types, canonical units, input validation and clinical classification.
// Shared by the API (authoritative) and the SPA (instant feedback, offline emergency banner).
//
// ⚠️ Thresholds are for adults and MUST be reviewed by a clinician before launch (PRD §7).
// Sources: ACC/AHA 2017 blood pressure guideline; ADA Standards of Care (glucose levels);
// common clinical ranges for heart rate, SpO2 and temperature; NCEP ATP III (total cholesterol).
import { z } from "zod";

export const VITAL_TYPES = ["heart_rate", "blood_pressure", "spo2", "weight", "glucose", "temperature", "cholesterol"] as const;
export type VitalType = (typeof VITAL_TYPES)[number];
export type Classification = "normal" | "borderline" | "high" | "low" | "critical";

/** Values are always stored in these units; the UI converts for display. */
export const CANONICAL_UNITS: Record<VitalType, string> = {
  heart_rate: "bpm",
  blood_pressure: "mmHg",
  spo2: "%",
  weight: "kg",
  glucose: "mg/dL",
  temperature: "°C",
  cholesterol: "mg/dL",
};

// Plausibility limits: reject typos, not unusual-but-real readings.
const PLAUSIBLE: Record<VitalType, [number, number]> = {
  heart_rate: [20, 250],
  blood_pressure: [50, 260], // systolic
  spo2: [50, 100],
  weight: [2, 400],
  glucose: [10, 1000],
  temperature: [30, 45],
  cholesterol: [50, 600],
};

export const vitalInputSchema = z
  .object({
    type: z.enum(VITAL_TYPES),
    value: z.number().finite(),
    value2: z.number().finite().optional(), // diastolic
    measuredAt: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    const [min, max] = PLAUSIBLE[v.type];
    if (v.value < min || v.value > max) {
      ctx.addIssue({ code: "custom", path: ["value"], message: `Must be between ${min} and ${max}` });
    }
    if (v.type === "blood_pressure") {
      if (v.value2 === undefined) ctx.addIssue({ code: "custom", path: ["value2"], message: "Diastolic is required" });
      else if (v.value2 < 30 || v.value2 > 160) ctx.addIssue({ code: "custom", path: ["value2"], message: "Must be between 30 and 160" });
      else if (v.value2 >= v.value) ctx.addIssue({ code: "custom", path: ["value2"], message: "Diastolic must be lower than systolic" });
    } else if (v.value2 !== undefined) {
      ctx.addIssue({ code: "custom", path: ["value2"], message: "Only blood pressure has a second value" });
    }
    if (v.measuredAt && v.measuredAt.getTime() > Date.now() + 5 * 60 * 1000) {
      ctx.addIssue({ code: "custom", path: ["measuredAt"], message: "Can't be in the future" });
    }
  });
export type VitalInput = z.infer<typeof vitalInputSchema>;

/** Classify a reading. Returns null for types without clinical thresholds (weight). */
export function classifyVital(type: VitalType, value: number, value2?: number | null): Classification | null {
  switch (type) {
    case "blood_pressure": {
      const sys = value;
      const dia = value2 ?? 0;
      if (sys >= 180 || dia >= 120) return "critical"; // hypertensive crisis
      if (sys < 70) return "critical"; // severe hypotension
      if (sys < 90 || dia < 60) return "low";
      if (sys >= 130 || dia >= 80) return "high"; // stage 1 and 2 hypertension
      if (sys >= 120) return "borderline"; // elevated
      return "normal";
    }
    case "heart_rate":
      if (value < 40 || value > 130) return "critical";
      if (value < 50) return "low";
      if (value > 100) return "high";
      return "normal";
    case "spo2":
      if (value < 90) return "critical";
      if (value < 95) return "borderline";
      return "normal";
    case "glucose":
      if (value < 54) return "critical"; // level 2 hypoglycaemia
      if (value < 70) return "low";
      if (value >= 300) return "critical";
      if (value >= 200) return "high";
      if (value > 140) return "borderline";
      return "normal";
    case "temperature":
      if (value < 35 || value >= 40) return "critical";
      if (value < 36) return "low";
      if (value >= 37.6) return "high";
      return "normal";
    case "cholesterol":
      if (value >= 240) return "high";
      if (value >= 200) return "borderline";
      return "normal";
    case "weight":
      return null;
  }
}

/** How many readings one import request may carry (the browser sends a large file in several requests). */
export const IMPORT_BATCH = 200;
export const vitalImportSchema = z.object({ items: z.array(vitalInputSchema).min(1, "Nothing to import").max(IMPORT_BATCH) });
