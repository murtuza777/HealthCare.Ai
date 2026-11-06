// Symptom input and red-flag detection. Deterministic: runs before (and without) any AI.
// ⚠️ Red-flag rules MUST be reviewed by a clinician before launch (PRD E-1, E-2).
import { z } from "zod";

export const SYMPTOM_TYPES = [
  "chest pain",
  "chest tightness",
  "shortness of breath",
  "palpitations",
  "dizziness",
  "fainting",
  "fatigue",
  "swelling in legs or ankles",
  "headache",
  "nausea",
  "sweating",
  "arm, jaw or back pain",
  "weakness on one side",
  "slurred speech",
  "confusion",
  "other",
] as const;

export const symptomInputSchema = z.object({
  type: z.string().trim().min(1).max(100),
  severity: z.number().int().min(1).max(10),
  durationMin: z.number().int().min(0).max(60 * 24 * 30).optional(),
  accompaniedBy: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  note: z.string().trim().max(1000).optional(),
  occurredAt: z.coerce.date().optional(),
});
export type SymptomInput = z.input<typeof symptomInputSchema>;

export type RedFlag = { emergency: true; reason: string } | { emergency: false };

const has = (all: Set<string>, ...needles: string[]) => needles.some((n) => [...all].some((s) => s.includes(n)));

/**
 * Emergency combinations (possible heart attack or stroke). Matching is on lower-cased
 * symptom names, so free text like "Chest pain" or "pain in chest" also counts.
 */
export function detectRedFlags(input: { type: string; accompaniedBy?: string[]; severity?: number }): RedFlag {
  const all = new Set([input.type, ...(input.accompaniedBy ?? [])].map((s) => s.toLowerCase().trim()));
  const chest = has(all, "chest pain", "pain in chest", "chest tightness", "chest pressure");

  if (chest && has(all, "shortness of breath", "breathless", "sweating", "arm", "jaw", "back pain", "nausea", "fainting", "dizz")) {
    return { emergency: true, reason: "Chest pain with these symptoms can be a heart attack." };
  }
  if (chest && (input.severity ?? 0) >= 7) {
    return { emergency: true, reason: "Severe chest pain needs urgent assessment." };
  }
  if (has(all, "weakness on one side", "face drooping", "slurred speech")) {
    return { emergency: true, reason: "These can be signs of a stroke. Note the time symptoms started." };
  }
  if (has(all, "fainting", "fainted", "passed out", "unconscious")) {
    return { emergency: true, reason: "Fainting with a heart condition needs urgent assessment." };
  }
  if (has(all, "shortness of breath") && (input.severity ?? 0) >= 8) {
    return { emergency: true, reason: "Severe shortness of breath needs urgent assessment." };
  }
  return { emergency: false };
}
