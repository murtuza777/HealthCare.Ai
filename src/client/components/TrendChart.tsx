import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { measuredAt: string; value: number; value2: number | null };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const INK = "#1C1D1F";
const SECOND = "#8A8C91";
const MUTED = "#73757A";

/**
 * Readings drawn as a fine ink trace over faint horizontal rules.
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
      <div className="flex items-center justify-center rounded-sheet border border-dashed border-line-strong px-6 text-center text-sm text-ink-muted" style={{ height }}>
        Log at least two readings to see the trend.
      </div>
    );
  }

  const first = data[0]!;
  const last = data[data.length - 1]!;
  // Readings within about a day share a date, so label the axis with times instead.
  const tick = +new Date(last.t) - +new Date(first.t) < 36 * 3600 * 1000 ? fmtTime : fmtDay;
  const summary = dual
    ? `From ${first.value}/${first.value2} to ${last.value}/${last.value2} ${unit} over ${data.length} readings.`
    : `From ${first.value} to ${last.value} ${unit} over ${data.length} readings.`;

  return (
    <figure className="m-0">
      <div className={drawIn ? "trace-draw" : undefined} style={{ height }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#E7E7E4" />
            <XAxis dataKey="t" tickFormatter={tick} stroke={MUTED} tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
            <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 12 }} tickLine={false} axisLine={false} width={40} tickMargin={6} tickCount={4} domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: INK, strokeOpacity: 0.25 }}
              contentStyle={{ background: "#fff", border: "1px solid #E7E7E4", borderRadius: 10, color: INK, boxShadow: "0 8px 24px -12px rgba(28,29,31,.25)" }}
              labelStyle={{ color: MUTED, marginBottom: 4 }}
              labelFormatter={(t) => new Date(String(t)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              formatter={(v, name) => [`${v} ${unit}`, name === "value2" ? "Diastolic" : dual ? "Systolic" : "Reading"]}
            />
            <Line type="linear" dataKey="value" stroke={INK} strokeWidth={1.75} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            {dual && <Line type="linear" dataKey="value2" stroke={SECOND} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {dual && (
        <figcaption className="mt-2 flex gap-5 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke={INK} strokeWidth="2" /></svg>Systolic (top)
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke={SECOND} strokeWidth="2" strokeDasharray="6 4" /></svg>Diastolic (bottom)
          </span>
        </figcaption>
      )}
    </figure>
  );
}
