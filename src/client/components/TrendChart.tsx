import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { measuredAt: string; value: number; value2: number | null };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const INK = "#14305A";
const ACTION = "#1F5FD1";
const MUTED = "#4A5F7A";

/**
 * Readings drawn like a trace on ECG paper (the grid is the page's signature, used only here).
 * Blood pressure: systolic solid, diastolic dashed, so the lines differ by shape as well as colour.
 */
export function TrendChart({
  points,
  unit,
  dual = false,
  height = 240,
  drawIn = false,
}: {
  points: Point[];
  unit: string;
  dual?: boolean;
  height?: number;
  drawIn?: boolean;
}) {
  const data = [...points]
    .sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt))
    .map((p) => ({ t: p.measuredAt, value: p.value, value2: p.value2 ?? undefined }));

  if (data.length < 2) {
    return (
      <div className="ecg-grid flex items-center justify-center rounded-control border border-grid-major/60 px-6 text-center text-sm text-ink-muted" style={{ height }}>
        Log at least two readings to see the trend.
      </div>
    );
  }

  const first = data[0]!;
  const last = data[data.length - 1]!;
  const summary = dual
    ? `From ${first.value}/${first.value2} to ${last.value}/${last.value2} ${unit} over ${data.length} readings.`
    : `From ${first.value} to ${last.value} ${unit} over ${data.length} readings.`;

  return (
    <figure className="m-0">
      <div className={`ecg-grid rounded-control border border-grid-major/60 ${drawIn ? "trace-draw" : ""}`} style={{ height }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
            <XAxis dataKey="t" tickFormatter={fmtDay} stroke={MUTED} tick={{ fill: MUTED, fontSize: 13 }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 13 }} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: INK, strokeOpacity: 0.25 }}
              contentStyle={{ background: "#fff", border: "1px solid #D6DFE8", borderRadius: 8, color: INK, boxShadow: "0 8px 24px -12px rgba(20,48,90,.3)" }}
              labelStyle={{ color: MUTED, marginBottom: 4 }}
              labelFormatter={(t) => new Date(String(t)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              formatter={(v, name) => [`${v} ${unit}`, name === "value2" ? "Diastolic" : dual ? "Systolic" : "Reading"]}
            />
            <Line type="linear" dataKey="value" stroke={INK} strokeWidth={2} dot={{ r: 2.5, fill: INK }} activeDot={{ r: 5 }} isAnimationActive={false} />
            {dual && <Line type="linear" dataKey="value2" stroke={ACTION} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2.5, fill: ACTION }} activeDot={{ r: 5 }} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {dual && (
        <figcaption className="mt-2 flex gap-5 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke={INK} strokeWidth="2" /></svg>Systolic (top)
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke={ACTION} strokeWidth="2" strokeDasharray="6 4" /></svg>Diastolic (bottom)
          </span>
        </figcaption>
      )}
    </figure>
  );
}
