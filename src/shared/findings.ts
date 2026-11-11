import { z } from "zod";

// Values read from an uploaded report. The model only transcribes what is printed; whether a
// value is low, normal or high is decided here, by comparing it with the printed reference range.

export type FindingFlag = "low" | "normal" | "high";

const num = z.preprocess((v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return v.trim() !== "" && Number.isFinite(n) ? n : null;
  }
  return null;
}, z.number().nullable());

const asText = (v: unknown) => (typeof v === "number" ? String(v) : v);

export const findingSchema = z.object({
  test: z.preprocess(asText, z.string().trim().min(1).max(120)),
  value: z.preprocess(asText, z.string().trim().min(1).max(60)),
  unit: z.preprocess((v) => (v == null || v === "" ? null : asText(v)), z.string().trim().max(30).nullable()).default(null),
  refLow: num.default(null),
  refHigh: num.default(null),
});
export type FindingInput = z.infer<typeof findingSchema>;

/** Compare a value with its printed reference range. Null when it can't be compared. */
export function flagFinding(value: string, refLow: number | null, refHigh: number | null): FindingFlag | null {
  if (refLow === null && refHigh === null) return null;
  const m = value.replace(/,/g, "").match(/^\s*[<>≤≥]?\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (refLow !== null && n < refLow) return "low";
  if (refHigh !== null && n > refHigh) return "high";
  return "normal";
}

export const MAX_FINDINGS = 60;

/**
 * Pull `{ summary, findings }` out of a model reply. Tolerates text around the JSON and drops
 * rows that don't validate, rather than failing the whole report.
 */
export function parseExtraction(reply: string): { summary: string | null; findings: FindingInput[] } | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { summary?: unknown; findings?: unknown };
  const rows = Array.isArray(obj.findings) ? obj.findings : [];
  const findings: FindingInput[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const parsed = findingSchema.safeParse(row);
    if (!parsed.success) continue;
    const key = `${parsed.data.test.toLowerCase()}|${parsed.data.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(parsed.data);
    if (findings.length >= MAX_FINDINGS) break;
  }
  const summary = typeof obj.summary === "string" && obj.summary.trim() ? obj.summary.trim().slice(0, 600) : null;
  return { summary, findings };
}
