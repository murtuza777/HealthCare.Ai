// Builds the compact patient summary the assistant answers from. Loaded server-side through the
// DAL, so the model only ever sees the signed-in patient's own record (never client-sent data).
import { ageFrom, bmi, riskFactors } from "../../shared/risk";
import { emergencyNumber } from "../../shared/emergency";
import type { VitalType } from "../../shared/vitals";
import type { Db } from "../db/client";
import type { Actor } from "../dal/authz";
import { adherence } from "../dal/doses";
import { listMedications } from "../dal/medications";
import { listReports } from "../dal/reports";
import { getProfile } from "../dal/profile";
import { listSymptoms } from "../dal/symptoms";
import { latestVitals, listVitals, type Vital } from "../dal/vitals";

const LABEL: Record<VitalType, string> = {
  blood_pressure: "Blood pressure",
  heart_rate: "Heart rate",
  spo2: "Oxygen saturation",
  weight: "Weight",
  glucose: "Blood glucose",
  temperature: "Temperature",
  cholesterol: "Total cholesterol",
};

// Plain status words the model can't misread; "critical" sounded like a diagnosis and lost the
// app's own emergency-range advice.
const STATUS: Record<string, string> = { normal: "normal", borderline: "borderline", high: "high", low: "low", critical: "EMERGENCY RANGE" };

const day = (d: Date, tz: string) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz });
const reading = (v: Vital) => (v.type === "blood_pressure" ? `${v.value}/${v.value2} ${v.unit}` : `${v.value} ${v.unit}`);

function trend(points: Vital[], tz: string): string | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => +a.measuredAt - +b.measuredAt);
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const sys = sorted.map((p) => p.value);
  const base = `${sorted.length} readings from ${day(first.measuredAt, tz)} to ${day(last.measuredAt, tz)}; first ${reading(first)}, latest ${reading(last)}, average ${avg(sys)}`;
  if (first.type === "blood_pressure") {
    const dia = sorted.map((p) => p.value2 ?? 0);
    return `${base}/${avg(dia)}; highest ${Math.max(...sys)}/${Math.max(...dia)}, lowest ${Math.min(...sys)}/${Math.min(...dia)}`;
  }
  return `${base}; highest ${Math.max(...sys)}, lowest ${Math.min(...sys)}`;
}

export type PatientContext = { text: string; emergencyNumber: string; firstName: string | null };

export async function buildPatientContext(db: Db, actor: Actor, now = new Date()): Promise<PatientContext> {
  const id = actor.userId;
  const [profile, latest, bp, hr, meds, symptoms, taken, reports] = await Promise.all([
    getProfile(db, actor, id),
    latestVitals(db, actor, id),
    listVitals(db, actor, id, { type: "blood_pressure", limit: 30 }),
    listVitals(db, actor, id, { type: "heart_rate", limit: 30 }),
    listMedications(db, actor, id),
    listSymptoms(db, actor, id, 10),
    adherence(db, actor, id, 7, now),
    listReports(db, actor, id),
  ]);
  const tz = profile?.timezone || "UTC";
  const lines: string[] = [];
  const firstName = profile?.name?.trim().split(/\s+/)[0] || null;

  lines.push(`Today: ${day(now, tz)}.`);
  const about = [
    firstName && `First name ${firstName}`,
    ageFrom(profile?.dateOfBirth, now) !== null && `age ${ageFrom(profile?.dateOfBirth, now)}`,
    profile?.sex && profile.sex !== "unspecified" && `sex ${profile.sex}`,
    profile?.heightCm && `height ${profile.heightCm} cm`,
    profile?.country && `country ${profile.country}`,
  ].filter(Boolean);
  lines.push(about.length ? `About: ${about.join(", ")}.` : "About: profile not filled in yet.");
  if (profile) {
    if (profile.conditions?.length) lines.push(`Diagnosed conditions: ${profile.conditions.join(", ")}.`);
    if (profile.hadHeartAttack) lines.push(`Previous heart attack${profile.lastHeartAttackAt ? ` (most recent ${profile.lastHeartAttackAt})` : ""}.`);
    if (profile.familyHistory?.length) lines.push(`Family history: ${profile.familyHistory.join(", ")}.`);
    if (profile.allergies?.length) lines.push(`Allergies: ${profile.allergies.join(", ")}.`);
    const l = profile.lifestyle;
    if (l) lines.push(`Lifestyle: ${l.smoker ? "smoker" : "non-smoker"}, alcohol ${l.alcohol}, exercises ${l.exerciseDaysPerWeek} days a week${l.stressLevel ? `, stress ${l.stressLevel}/10` : ""}.`);
  }

  const latestLines = (Object.values(latest) as Vital[])
    .sort((a, b) => +b.measuredAt - +a.measuredAt)
    .map((v) => `- ${LABEL[v.type as VitalType]}: ${reading(v)}${v.classification ? ` (${STATUS[v.classification] ?? v.classification})` : ""}, ${day(v.measuredAt, tz)}`);
  lines.push(latestLines.length ? `Latest readings:\n${latestLines.join("\n")}` : "Latest readings: none logged yet.");
  const bpTrend = trend(bp, tz);
  if (bpTrend) lines.push(`Blood pressure trend: ${bpTrend}.`);
  const hrTrend = trend(hr, tz);
  if (hrTrend) lines.push(`Heart rate trend: ${hrTrend}.`);
  const b = bmi(profile?.heightCm, latest.weight?.value);
  if (b) lines.push(`BMI: ${b.toFixed(1)}.`);

  lines.push(
    meds.length
      ? `Current medicines:\n${meds.map((m) => `- ${m.name} ${m.dose}${m.schedule.times.length ? ` at ${m.schedule.times.join(", ")}` : ""}${m.instructions ? ` (${m.instructions})` : ""}`).join("\n")}`
      : "Current medicines: none recorded.",
  );
  const due = taken.days.reduce((a, d) => a + d.due, 0);
  if (due) {
    const sum = (k: "taken" | "skipped" | "missed") => taken.days.reduce((a, d) => a + d[k], 0);
    lines.push(`Medicine doses in the last 7 days: ${sum("taken")} of ${due} due doses marked taken, ${sum("skipped")} skipped, ${sum("missed")} missed (${taken.percent}%).`);
  }
  lines.push(
    symptoms.length
      ? `Recent symptoms:\n${symptoms.map((s) => `- ${day(s.occurredAt, tz)}: ${s.type}, severity ${s.severity}/10${s.accompaniedBy.length ? `, with ${s.accompaniedBy.join(", ")}` : ""}`).join("\n")}`
      : "Recent symptoms: none logged.",
  );

  if (reports.length) {
    const items = reports.slice(0, 10).map((r) => `- ${r.title} (${r.type}${r.reportDate ? `, ${r.reportDate}` : ""})${r.summary ? `: ${r.summary}` : ""}`);
    lines.push(`Uploaded reports (titles only unless a summary is given; the files themselves aren't read):\n${items.join("\n")}`);
  }

  const present = riskFactors(profile, latest, now).filter((f) => f.status === "present");
  if (present.length) lines.push(`Heart risk factors present: ${present.map((f) => f.label).join(", ")}.`);

  return { text: lines.join("\n"), emergencyNumber: emergencyNumber(profile?.country), firstName };
}
