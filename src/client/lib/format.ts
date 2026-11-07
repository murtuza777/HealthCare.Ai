import type { VitalType } from "../../shared/vitals";

export const VITAL_LABELS: Record<VitalType, string> = {
  blood_pressure: "Blood pressure",
  heart_rate: "Heart rate",
  spo2: "Oxygen (SpO₂)",
  weight: "Weight",
  glucose: "Blood glucose",
  temperature: "Temperature",
  cholesterol: "Cholesterol",
};

export function formatReading(v: { type: VitalType; value: number; value2: number | null; unit: string }) {
  return v.type === "blood_pressure" ? `${v.value}/${v.value2} ${v.unit}` : `${v.value} ${v.unit}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-05" → "5 Nov 2026" in the user's locale, without shifting the day across time zones. */
export function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Today's date in the user's local time zone (YYYY-MM-DD). Not toISOString(), which is UTC. */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local date-time for <input type="datetime-local"> (YYYY-MM-DDTHH:MM). */
export function localDateTime(d = new Date()) {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(iso: string | Date, now = Date.now()) {
  const s = Math.round((now - +new Date(iso)) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
