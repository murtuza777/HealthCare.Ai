// Reads a CSV exported by a home monitor or a spreadsheet into readings. It runs in the
// browser, so the file itself never leaves the device; only the readings found are sent.
//
// Columns are found by their header names (date, time, systolic, diastolic, pulse, oxygen,
// weight, glucose, temperature, note), in any order. Each row can hold several readings.
import { vitalInputSchema, type VitalType } from "./vitals";

export type ImportedReading = { type: VitalType; value: number; value2?: number; measuredAt: Date; note?: string };
export type CsvImport = {
  readings: ImportedReading[];
  /** Data rows that produced no reading (no date, or nothing plausible in them). */
  skipped: number;
  /** True when dates like 03/04/2026 could be read either way. */
  ambiguousDates: boolean;
  problem?: string;
};

export const MAX_IMPORT_ROWS = 5000;

/** Split CSV text into rows of cells. Handles quotes, and commas, semicolons or tabs as separators. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // drop a byte-order mark
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const sep = count("\t") > count(",") && count("\t") >= count(";") ? "\t" : count(";") > count(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

type Column = "date" | "time" | "datetime" | "systolic" | "diastolic" | "pulse" | "spo2" | "weight" | "glucose" | "temperature" | "note";

function columnOf(header: string): Column | null {
  const h = header.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (/sys/.test(h)) return "systolic";
  if (/dia/.test(h)) return "diastolic";
  if (/pulse|heart ?rate|^hr\b|bpm/.test(h)) return "pulse";
  if (/spo2|sp02|oxygen|saturation/.test(h)) return "spo2";
  if (/weight/.test(h)) return "weight";
  if (/glucose|sugar/.test(h)) return "glucose";
  if (/temp/.test(h)) return "temperature";
  if (/note|comment|remark/.test(h)) return "note";
  if (/date ?(and |& )?time|timestamp|measured|measurement (date|time)|taken at|recorded/.test(h)) return "datetime";
  if (/^time\b/.test(h)) return "time";
  if (/date|^day$/.test(h)) return "date";
  return null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseTime(s: string): [number, number] | null {
  const m = s.trim().match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h > 23 || min > 59 ? null : [h, min];
}

/** Parse a date (with an optional time after it). Returns the date and whether day/month order was a guess. */
export function parseWhen(dateText: string, timeText: string | undefined, dayFirst: boolean): { at: Date; ambiguous: boolean } | null {
  let text = dateText.trim().replace(/\s+/g, " ");
  if (!text) return null;
  let time: [number, number] | null = timeText ? parseTime(timeText) : null;
  // A time attached to the date: "2026-11-05 08:30", "2026-11-05T08:30:00", "5/11/2026 8:30 AM".
  const attached = text.match(/^(.*?)[ T](\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[ap]m)?)(?:\.\d+)?(?:z|[+-]\d{2}:?\d{2})?$/i);
  if (attached) {
    text = attached[1]!.trim();
    time = time ?? parseTime(attached[2]!);
  }
  let y: number, mo: number, d: number;
  let ambiguous = false;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    y = Number(m[3]);
    if (y < 100) y += 2000;
    if (a > 12) [d, mo] = [a, b];
    else if (b > 12) [mo, d] = [a, b];
    else {
      ambiguous = a !== b;
      [d, mo] = dayFirst ? [a, b] : [b, a];
    }
  } else if ((m = text.match(/^(\d{1,2}) ([a-z]{3})[a-z]*\.?,? (\d{4})$/i)) && MONTHS.includes(m[2]!.toLowerCase())) {
    [d, mo, y] = [Number(m[1]), MONTHS.indexOf(m[2]!.toLowerCase()) + 1, Number(m[3])];
  } else if ((m = text.match(/^([a-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})$/i)) && MONTHS.includes(m[1]!.toLowerCase())) {
    [mo, d, y] = [MONTHS.indexOf(m[1]!.toLowerCase()) + 1, Number(m[2]), Number(m[3])];
  } else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990) return null;
  const at = new Date(y, mo - 1, d, time?.[0] ?? 12, time?.[1] ?? 0);
  // Reject dates that rolled over (31 February) and anything in the future.
  if (at.getMonth() !== mo - 1 || at.getTime() > Date.now() + 5 * 60_000) return null;
  return { at, ambiguous };
}

const number = (s: string | undefined) => {
  if (!s) return null;
  const m = s.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export function readingsFromCsv(text: string, opts: { dayFirst?: boolean } = {}): CsvImport {
  const dayFirst = opts.dayFirst ?? true;
  const rows = parseCsv(text);
  const empty = (problem: string): CsvImport => ({ readings: [], skipped: 0, ambiguousDates: false, problem });
  if (rows.length < 2) return empty("This file has no rows of readings.");
  // The header is the first row that names a date and at least one measurement.
  const headerAt = rows.slice(0, 15).findIndex((r) => {
    const cols = r.map(columnOf);
    return cols.some((c) => c === "date" || c === "datetime") && cols.some((c) => c && !["date", "time", "datetime", "note"].includes(c));
  });
  if (headerAt < 0) return empty('No columns were recognised. The file needs a header row with a "Date" column and at least one of: Systolic and Diastolic, Pulse, Oxygen, Weight, Glucose, Temperature.');
  const header = rows[headerAt]!;
  const index = new Map<Column, number>();
  header.forEach((h, i) => {
    const c = columnOf(h);
    if (c && !index.has(c)) index.set(c, i);
  });
  const headerText = (c: Column) => (header[index.get(c) ?? -1] ?? "").toLowerCase();
  const pounds = /\blbs?\b|pound/.test(headerText("weight"));
  const fahrenheit = /°f|\(f\)|fahrenheit/.test(headerText("temperature"));
  const mmol = /mmol/.test(headerText("glucose"));

  const readings: ImportedReading[] = [];
  let skipped = 0;
  let ambiguousDates = false;
  const data = rows.slice(headerAt + 1, headerAt + 1 + MAX_IMPORT_ROWS);
  for (const row of data) {
    const cell = (c: Column) => (index.has(c) ? row[index.get(c)!] : undefined);
    const when = parseWhen(cell("datetime") ?? cell("date") ?? "", cell("time"), dayFirst);
    if (!when) {
      skipped++;
      continue;
    }
    ambiguousDates ||= when.ambiguous;
    const note = cell("note")?.slice(0, 500) || undefined;
    const before = readings.length;
    const add = (type: VitalType, value: number | null, value2?: number | null) => {
      if (value === null || (type === "blood_pressure" && value2 == null)) return;
      const candidate = { type, value, ...(type === "blood_pressure" ? { value2: value2! } : {}), measuredAt: when.at, ...(note ? { note } : {}) };
      if (vitalInputSchema.safeParse(candidate).success) readings.push(candidate);
    };
    add("blood_pressure", number(cell("systolic")), number(cell("diastolic")));
    add("heart_rate", number(cell("pulse")));
    add("spo2", number(cell("spo2")));
    const w = number(cell("weight"));
    add("weight", w === null ? null : pounds ? round1(w * 0.45359237) : w);
    const g = number(cell("glucose"));
    add("glucose", g === null ? null : mmol ? Math.round(g * 18) : g);
    const t = number(cell("temperature"));
    add("temperature", t === null ? null : fahrenheit || t > 45 ? round1(((t - 32) * 5) / 9) : t);
    if (readings.length === before) skipped++;
  }
  if (!readings.length) return { readings, skipped, ambiguousDates, problem: "No readings could be read from this file. Check that the dates and numbers are in separate columns." };
  return { readings, skipped, ambiguousDates };
}
