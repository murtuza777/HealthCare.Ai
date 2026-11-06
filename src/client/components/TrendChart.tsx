import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { measuredAt: string; value: number; value2: number | null };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Line chart of readings, oldest → newest. Blood pressure draws two lines. */
export function TrendChart({ points, unit, dual = false, height = 220 }: { points: Point[]; unit: string; dual?: boolean; height?: number }) {
  const data = [...points]
    .sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt))
    .map((p) => ({ t: p.measuredAt, value: p.value, value2: p.value2 ?? undefined }));

  if (data.length < 2) {
    return <p className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>Log at least two readings to see a trend.</p>;
  }

  return (
    <div style={{ height }} role="img" aria-label={`Trend of ${data.length} readings in ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={fmtDay} stroke="#9ca3af" fontSize={12} tickLine={false} minTickGap={24} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff" }}
            labelFormatter={(t) => new Date(String(t)).toLocaleString()}
            formatter={(v, name) => [`${v} ${unit}`, name === "value2" ? "Diastolic" : dual ? "Systolic" : "Reading"]}
          />
          <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          {dual && <Line type="monotone" dataKey="value2" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
