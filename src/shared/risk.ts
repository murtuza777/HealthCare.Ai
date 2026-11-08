// Heart-disease risk factors (replaces the legacy invented point score).
// Lists recognized factors (AHA/WHO) as present / absent / not recorded. It is NOT a risk
// percentage; validated calculators (e.g. PREVENT, QRISK3) need data we don't collect yet.
// ⚠️ Review with a clinician before launch.

export type RiskFactorStatus = "present" | "absent" | "unknown";
export type RiskFactor = { id: string; label: string; status: RiskFactorStatus; detail: string };

type ProfileLike = {
  dateOfBirth?: string | null;
  sex?: string | null;
  heightCm?: number | null;
  conditions?: string[];
  familyHistory?: string[];
  hadHeartAttack?: boolean;
  lifestyle?: { smoker: boolean; exerciseDaysPerWeek: number } | null;
} | null;

type Reading = { value: number; value2?: number | null; classification?: string | null } | undefined;
export type LatestReadings = { blood_pressure?: Reading; cholesterol?: Reading; glucose?: Reading; weight?: Reading };

const lower = (xs?: string[]) => (xs ?? []).map((x) => x.toLowerCase());
const mentions = (xs: string[], ...words: string[]) => xs.some((x) => words.some((w) => x.includes(w)));

export function ageFrom(dateOfBirth?: string | null, now = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function bmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg) return null;
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
}

export function riskFactors(profile: ProfileLike, latest: LatestReadings, now = new Date()): RiskFactor[] {
  const conditions = lower(profile?.conditions);
  const family = lower(profile?.familyHistory);
  const out: RiskFactor[] = [];
  const push = (id: string, label: string, status: RiskFactorStatus, detail: string) => out.push({ id, label, status, detail });

  push(
    "heart_attack",
    "Previous heart attack",
    profile ? (profile.hadHeartAttack ? "present" : "absent") : "unknown",
    profile?.hadHeartAttack ? "A previous heart attack is the strongest predictor of another one." : profile ? "Not in your history." : "Not recorded yet.",
  );

  const listedHeartDisease = mentions(conditions, "coronary", "heart failure", "atrial fibrillation", "angina", "heart disease", "cardiomyopathy");
  // A previous heart attack means coronary heart disease, even if it isn't listed separately.
  const heartDisease = listedHeartDisease || Boolean(profile?.hadHeartAttack);
  push("heart_disease", "Existing heart disease", profile ? (heartDisease ? "present" : "absent") : "unknown",
    listedHeartDisease ? "Listed in your conditions." : heartDisease ? "A previous heart attack means coronary heart disease." : "None listed.");

  const bp = latest.blood_pressure;
  const hypertension = mentions(conditions, "hypertension", "high blood pressure");
  const bpHigh = bp && (bp.classification === "high" || bp.classification === "critical");
  push("blood_pressure", "High blood pressure",
    bpHigh || hypertension ? "present" : bp ? "absent" : profile ? "absent" : "unknown",
    bp ? `Latest reading ${bp.value}/${bp.value2} mmHg${hypertension ? "; hypertension is in your conditions" : ""}.`
      : hypertension ? "Hypertension is in your conditions." : "No blood pressure reading yet.");

  const chol = latest.cholesterol;
  const cholCondition = mentions(conditions, "cholesterol", "hyperlipid", "dyslipid");
  push("cholesterol", "High cholesterol",
    cholCondition || (chol && chol.value >= 240) ? "present" : chol ? "absent" : "unknown",
    chol
      ? `Latest total cholesterol ${chol.value} mg/dL${chol.value >= 240 ? "" : chol.value >= 200 ? " (borderline high)" : ""}.`
      : cholCondition ? "Listed in your conditions." : "No cholesterol reading yet.");

  const glucose = latest.glucose;
  const diabetes = mentions(conditions, "diabetes");
  push("diabetes", "Diabetes or high blood sugar",
    diabetes || (glucose && (glucose.classification === "high" || glucose.classification === "critical")) ? "present" : glucose || profile ? "absent" : "unknown",
    diabetes ? "Diabetes is in your conditions." : glucose ? `Latest glucose ${glucose.value} mg/dL.` : profile ? "Not in your conditions. Log a glucose reading to check." : "No glucose reading yet.");

  const smoker = profile?.lifestyle?.smoker;
  push("smoking", "Smoking", smoker === undefined ? "unknown" : smoker ? "present" : "absent",
    smoker ? "Stopping smoking is one of the most effective ways to lower heart risk." : smoker === false ? "Non-smoker." : "Not recorded.");

  const days = profile?.lifestyle?.exerciseDaysPerWeek;
  push("inactivity", "Low physical activity", days === undefined ? "unknown" : days < 3 ? "present" : "absent",
    days === undefined ? "Not recorded." : `Active ${days} day${days === 1 ? "" : "s"} a week (aim for at least 150 minutes a week).`);

  const b = bmi(profile?.heightCm, latest.weight?.value);
  push("weight", "Overweight", b === null ? "unknown" : b >= 25 ? "present" : "absent",
    b === null ? "Needs height and a weight reading." : `BMI ${b}${b >= 30 ? " (obesity range)" : b >= 25 ? " (overweight range)" : ""}.`);

  const age = ageFrom(profile?.dateOfBirth, now);
  const ageLimit = profile?.sex === "female" ? 55 : 45;
  push("age", "Age", age === null ? "unknown" : age >= ageLimit ? "present" : "absent",
    age === null ? "Add your date of birth." : `${age} years old.`);

  const familyHeart = mentions(family, "heart", "cardiac", "stroke");
  push("family", "Family history of heart disease", profile ? (familyHeart ? "present" : "absent") : "unknown",
    familyHeart ? "Listed in your family history." : "None listed.");

  return out;
}
