// Lightweight static chart for the landing page (no chart library in the first-visit bundle).
// Same visual language as TrendChart: ink trace over faint rules, systolic solid, diastolic dashed.

type Point = { value: number; value2: number };

const W = 960;
const H = 280;
const PAD = { top: 12, right: 4, bottom: 34, left: 44 };

export function SampleTrace({ points, labels, drawIn = false }: { points: Point[]; labels: string[]; drawIn?: boolean }) {
  const all = points.flatMap((p) => [p.value, p.value2]);
  const min = Math.floor((Math.min(...all) - 6) / 10) * 10;
  const max = Math.ceil((Math.max(...all) + 6) / 10) * 10;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const path = (key: "value" | "value2") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");
  const ticks = [min, Math.round((min + max) / 2), max];
  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    <figure className="m-0">
      <div className={drawIn ? "trace-draw" : undefined}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Sample chart: blood pressure from ${first.value}/${first.value2} to ${last.value}/${last.value2} mmHg over ${points.length} days.`}
        >
          {ticks.map((t) => (
            <line key={`l${t}`} x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E7E7E4" strokeWidth="1" />
          ))}
          {ticks.map((t) => (
            <text key={t} x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="13" fill="#73757A">
              {t}
            </text>
          ))}
          {labels.map((l, i) => (
            <text
              key={l}
              x={x(Math.round((i / (labels.length - 1)) * (points.length - 1)))}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
              fontSize="13"
              fill="#73757A"
            >
              {l}
            </text>
          ))}
          <g className="recharts-line">
            <path d={path("value")} fill="none" stroke="#1C1D1F" strokeWidth="1.75" strokeLinejoin="round" />
          </g>
          <g className="recharts-line">
            <path d={path("value2")} fill="none" stroke="#8A8C91" strokeWidth="1.75" strokeDasharray="7 5" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
      <figcaption className="mt-2 flex gap-5 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="#1C1D1F" strokeWidth="2" /></svg>Systolic (top)
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="#8A8C91" strokeWidth="2" strokeDasharray="6 4" /></svg>Diastolic (bottom)
        </span>
      </figcaption>
    </figure>
  );
}
