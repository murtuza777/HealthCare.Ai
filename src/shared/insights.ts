// Slow changes worth knowing about: things no single reading shows. Plain rules, checked once
// a day for each patient; never AI. An emergency is handled elsewhere (vitals.ts, symptoms.ts);
// everything here is "tell your doctor", not "call an ambulance".
//
// Thresholds are deliberately conservative and are pending clinician review (see README).

export type InsightKind = "insight:bp-rising" | "insight:bp-high" | "insight:pulse-high" | "insight:doses-missed" | "insight:weight-gain" | "insight:no-readings";

export type Insight = { kind: InsightKind; severity: "info" | "warning"; title: string; body: string };

type Reading = { value: number; value2?: number | null; measuredAt: Date };
export type InsightInput = {
  now: Date;
  bloodPressure: Reading[];
  heartRate: Reading[];
  weight: Reading[];
  /** Doses in the last 7 days that were due, and how many of those were missed or skipped. */
  doses: { due: number; missed: number; skipped: number };
  /** When anything at all was last logged, or null if never. */
  lastReadingAt: Date | null;
  totalReadings: number;
};

const DAY = 86_400_000;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round = (n: number) => Math.round(n);
const within = (rs: Reading[], now: Date, fromDays: number, toDays: number) =>
  rs.filter((r) => {
    const age = now.getTime() - r.measuredAt.getTime();
    return age >= toDays * DAY && age < fromDays * DAY;
  });

/** Fewer readings than this in a week isn't enough to call a trend. */
export const MIN_READINGS = 3;

export function findInsights(input: InsightInput): Insight[] {
  const { now } = input;
  const out: Insight[] = [];

  // Blood pressure: this week against the week before, then this week on its own.
  const bpNow = within(input.bloodPressure, now, 7, 0);
  const bpBefore = within(input.bloodPressure, now, 14, 7);
  if (bpNow.length >= MIN_READINGS) {
    const sys = avg(bpNow.map((r) => r.value));
    const dia = avg(bpNow.map((r) => r.value2 ?? 0));
    const rising =
      bpBefore.length >= MIN_READINGS &&
      (sys - avg(bpBefore.map((r) => r.value)) >= 10 || dia - avg(bpBefore.map((r) => r.value2 ?? 0)) >= 5) &&
      (sys >= 130 || dia >= 80);
    if (rising) {
      const was = `${round(avg(bpBefore.map((r) => r.value)))}/${round(avg(bpBefore.map((r) => r.value2 ?? 0)))}`;
      out.push({
        kind: "insight:bp-rising",
        severity: "warning",
        title: "Blood pressure has been rising",
        body: `This week's average is ${round(sys)}/${round(dia)}, up from ${was} the week before. Worth telling the doctor; don't change any medicine without them.`,
      });
    } else if (sys >= 140 || dia >= 90) {
      out.push({
        kind: "insight:bp-high",
        severity: "warning",
        title: "Blood pressure has stayed high this week",
        body: `The average of ${bpNow.length} readings is ${round(sys)}/${round(dia)}. A week at this level is worth raising with the doctor.`,
      });
    }
  }

  const hrNow = within(input.heartRate, now, 7, 0);
  if (hrNow.length >= MIN_READINGS && avg(hrNow.map((r) => r.value)) >= 100) {
    out.push({
      kind: "insight:pulse-high",
      severity: "warning",
      title: "Resting pulse has been fast this week",
      body: `The average of ${hrNow.length} readings is ${round(avg(hrNow.map((r) => r.value)))} beats a minute. If these were taken at rest, tell the doctor.`,
    });
  }

  const notTaken = input.doses.missed + input.doses.skipped;
  if (input.doses.due >= 5 && notTaken >= 2 && notTaken / input.doses.due > 0.2) {
    out.push({
      kind: "insight:doses-missed",
      severity: "warning",
      title: `${notTaken} doses weren't taken this week`,
      body: `${input.doses.due - notTaken} of ${input.doses.due} doses were marked as taken. If something makes the medicines hard to take, a pharmacist or the doctor can help.`,
    });
  }

  // Sudden weight gain: the latest weight against the lowest of the previous 7 days.
  const weights = within(input.weight, now, 8, 0).sort((a, b) => +a.measuredAt - +b.measuredAt);
  const latest = weights[weights.length - 1];
  if (latest && weights.length >= 2 && now.getTime() - latest.measuredAt.getTime() < 2 * DAY) {
    const lowest = Math.min(...weights.slice(0, -1).map((w) => w.value));
    const gain = latest.value - lowest;
    if (gain >= 2) {
      out.push({
        kind: "insight:weight-gain",
        severity: "warning",
        title: `Weight is up ${gain.toFixed(1)} kg in a week`,
        body: "With a heart condition, a quick gain like this can be fluid building up. Tell the doctor or heart nurse today, especially with swollen ankles or more breathlessness.",
      });
    }
  }

  if (input.totalReadings >= 3 && input.lastReadingAt) {
    const days = Math.floor((now.getTime() - input.lastReadingAt.getTime()) / DAY);
    if (days >= 7) {
      out.push({
        kind: "insight:no-readings",
        severity: "info",
        title: `No readings for ${days} days`,
        body: "Regular readings are what make trends and alerts work. A quick blood pressure check today gets things back on track.",
      });
    }
  }

  return out;
}
