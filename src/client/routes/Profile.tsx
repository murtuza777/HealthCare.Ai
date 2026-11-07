import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useNavigate } from "react-router";
import { COUNTRIES } from "../../shared/emergency";
import { localDate } from "../lib/format";
import { useAddVital, useProfile, useSaveProfile, type ProfileUpdate, type VitalNew } from "../lib/queries";
import { Button, Card, ErrorText, Field, inputClass, Loading, PageHeader } from "../components/ui";

// Ported from legacy/app/components/PatientDetailsForm.tsx (same 4 steps).
// Changes: date of birth instead of age; country, timezone and emergency contact added;
// readings entered here are saved as real, timestamped vitals.

const HEART_CONDITIONS = [
  "Coronary artery disease",
  "Heart failure",
  "Atrial fibrillation",
  "Angina",
  "Hypertension",
  "Diabetes",
  "High cholesterol",
];
const FAMILY = ["Heart disease", "Stroke", "Diabetes", "High blood pressure"];

const STEPS = ["About you", "Heart history", "Current readings", "Lifestyle"];

type Form = {
  name: string;
  dateOfBirth: string;
  sex: "" | "female" | "male" | "other" | "unspecified";
  heightCm: string;
  country: string;
  timezone: string;
  contactName: string;
  contactPhone: string;
  contactRelation: string;
  conditions: string[];
  otherConditions: string;
  hadHeartAttack: boolean;
  lastHeartAttackAt: string;
  allergies: string;
  family: string[];
  otherFamily: string;
  weight: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  cholesterol: string;
  glucose: string;
  smoker: boolean;
  alcohol: "none" | "light" | "moderate" | "heavy";
  exerciseDaysPerWeek: string;
  diet: string;
  stressLevel: string;
};

const split = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function Profile() {
  const { data: profile, isPending } = useProfile();
  if (isPending) return <Loading />;
  // Remount the form when the profile first arrives so defaults come from saved data.
  return <ProfileForm key={profile?.updatedAt ?? "new"} profile={profile ?? null} />;
}

function ProfileForm({ profile }: { profile: NonNullable<ReturnType<typeof useProfile>["data"]> | null }) {
  const navigate = useNavigate();
  const save = useSaveProfile();
  const addVital = useAddVital();
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const knownConditions = (profile?.conditions ?? []).filter((c) => HEART_CONDITIONS.includes(c));
  const otherConditions = (profile?.conditions ?? []).filter((c) => !HEART_CONDITIONS.includes(c));
  const knownFamily = (profile?.familyHistory ?? []).filter((c) => FAMILY.includes(c));
  const otherFamily = (profile?.familyHistory ?? []).filter((c) => !FAMILY.includes(c));

  const [f, setF] = useState<Form>({
    name: profile?.name ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    sex: profile?.sex ?? "",
    heightCm: profile?.heightCm?.toString() ?? "",
    country: profile?.country ?? "",
    timezone: profile?.timezone && profile.timezone !== "UTC" ? profile.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
    contactName: profile?.emergencyContact?.name ?? "",
    contactPhone: profile?.emergencyContact?.phone ?? "",
    contactRelation: profile?.emergencyContact?.relation ?? "",
    conditions: knownConditions,
    otherConditions: otherConditions.join(", "),
    hadHeartAttack: profile?.hadHeartAttack ?? false,
    lastHeartAttackAt: profile?.lastHeartAttackAt ?? "",
    allergies: (profile?.allergies ?? []).join(", "),
    family: knownFamily,
    otherFamily: otherFamily.join(", "),
    weight: "",
    systolic: "",
    diastolic: "",
    heartRate: "",
    cholesterol: "",
    glucose: "",
    smoker: profile?.lifestyle?.smoker ?? false,
    alcohol: profile?.lifestyle?.alcohol ?? "none",
    exerciseDaysPerWeek: profile?.lifestyle?.exerciseDaysPerWeek?.toString() ?? "0",
    diet: profile?.lifestyle?.diet ?? "",
    stressLevel: profile?.lifestyle?.stressLevel?.toString() ?? "5",
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const toggle = (k: "conditions" | "family", v: string) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  function validate(s: number): string | null {
    if (s === 0) {
      if (!f.name.trim()) return "Please enter your name.";
      if (f.dateOfBirth && new Date(f.dateOfBirth) > new Date()) return "Date of birth can't be in the future.";
      if ((f.contactName && !f.contactPhone) || (!f.contactName && f.contactPhone)) return "Add both a name and a phone number for your emergency contact.";
    }
    if (s === 2 && (f.systolic || f.diastolic) && !(f.systolic && f.diastolic)) return "Enter both blood pressure numbers, or neither.";
    return null;
  }

  function next() {
    const err = validate(step);
    setStepError(err);
    if (!err) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    // Enter in a field on an early step moves forward instead of saving.
    if (step < STEPS.length - 1) return next();
    const err = validate(0) ?? validate(2);
    if (err) return setStepError(err);
    setStepError(null);

    const body: ProfileUpdate = {
      name: f.name.trim(),
      dateOfBirth: f.dateOfBirth || null,
      sex: f.sex || null,
      heightCm: f.heightCm ? Number(f.heightCm) : null,
      country: f.country || null,
      timezone: f.timezone,
      conditions: [...f.conditions, ...split(f.otherConditions)],
      allergies: split(f.allergies),
      familyHistory: [...f.family, ...split(f.otherFamily)],
      hadHeartAttack: f.hadHeartAttack,
      lastHeartAttackAt: f.hadHeartAttack && f.lastHeartAttackAt ? f.lastHeartAttackAt : null,
      emergencyContact: f.contactName && f.contactPhone
        ? { name: f.contactName.trim(), phone: f.contactPhone.trim(), ...(f.contactRelation ? { relation: f.contactRelation.trim() } : {}) }
        : null,
      lifestyle: {
        smoker: f.smoker,
        alcohol: f.alcohol,
        exerciseDaysPerWeek: Number(f.exerciseDaysPerWeek),
        ...(f.diet ? { diet: f.diet } : {}),
        stressLevel: Number(f.stressLevel),
      },
    };
    await save.mutateAsync(body);

    const readings: VitalNew[] = [];
    if (f.weight) readings.push({ type: "weight", value: Number(f.weight) });
    if (f.systolic && f.diastolic) readings.push({ type: "blood_pressure", value: Number(f.systolic), value2: Number(f.diastolic) });
    if (f.heartRate) readings.push({ type: "heart_rate", value: Number(f.heartRate) });
    if (f.cholesterol) readings.push({ type: "cholesterol", value: Number(f.cholesterol) });
    if (f.glucose) readings.push({ type: "glucose", value: Number(f.glucose) });
    for (const r of readings) await addVital.mutateAsync(r);

    navigate("/app", { state: { toast: "Profile saved" } });
  }

  const busy = save.isPending || addVital.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={profile ? "Update your health profile" : "Set up your health profile"} subtitle="This helps us check your readings and personalise guidance. Only you can see it unless you invite a caretaker." />
      <Card>
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm font-semibold text-ink-muted">
            <span>
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-well">
            <div className="h-full rounded-full bg-action transition-[width] duration-300 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          <div key={step} className="space-y-5">
              {step === 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <input className={inputClass} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required />
                    </Field>
                    <Field label="Date of birth">
                      <input type="date" className={inputClass} value={f.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} max={localDate()} />
                    </Field>
                    <Field label="Sex" hint="Used for age-related risk thresholds.">
                      <select className={inputClass} value={f.sex} onChange={(e) => set("sex", e.target.value as Form["sex"])}>
                        <option value="">Prefer not to say</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Height (cm)">
                      <input type="number" inputMode="decimal" min={40} max={260} className={inputClass} value={f.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
                    </Field>
                    <Field label="Country" hint="Sets your local emergency number.">
                      <select className={inputClass} value={f.country} onChange={(e) => set("country", e.target.value)}>
                        <option value="">Select…</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Time zone" hint="Used to schedule medication reminders.">
                      <input className={inputClass} value={f.timezone} onChange={(e) => set("timezone", e.target.value)} />
                    </Field>
                  </div>
                  <fieldset className="rounded-sheet border border-line p-4">
                    <legend className="px-1 text-sm font-semibold text-ink">Emergency contact (optional)</legend>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Name">
                        <input className={inputClass} value={f.contactName} onChange={(e) => set("contactName", e.target.value)} />
                      </Field>
                      <Field label="Phone">
                        <input type="tel" className={inputClass} value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
                      </Field>
                      <Field label="Relation">
                        <input className={inputClass} value={f.contactRelation} onChange={(e) => set("contactRelation", e.target.value)} placeholder="Daughter" />
                      </Field>
                    </div>
                  </fieldset>
                </>
              )}

              {step === 1 && (
                <>
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-ink">Conditions you've been diagnosed with</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {HEART_CONDITIONS.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-ink">
                          <input type="checkbox" className="h-4 w-4 accent-action" checked={f.conditions.includes(c)} onChange={() => toggle("conditions", c)} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Other conditions" hint="Separate with commas.">
                    <input className={inputClass} value={f.otherConditions} onChange={(e) => set("otherConditions", e.target.value)} />
                  </Field>
                  <label className="flex items-center gap-2 text-ink">
                    <input type="checkbox" className="h-4 w-4 accent-action" checked={f.hadHeartAttack} onChange={(e) => set("hadHeartAttack", e.target.checked)} />
                    I have had a heart attack
                  </label>
                  {f.hadHeartAttack && (
                    <Field label="When was the most recent one?">
                      <input type="date" className={inputClass} value={f.lastHeartAttackAt} onChange={(e) => set("lastHeartAttackAt", e.target.value)} max={localDate()} />
                    </Field>
                  )}
                  <Field label="Allergies" hint="Medicines and foods, separated with commas.">
                    <input className={inputClass} value={f.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Penicillin, peanuts" />
                  </Field>
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-ink">Close family (parents, siblings) with</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FAMILY.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-ink">
                          <input type="checkbox" className="h-4 w-4 accent-action" checked={f.family.includes(c)} onChange={() => toggle("family", c)} />
                          {c}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Other family history" hint="Separate with commas.">
                    <input className={inputClass} value={f.otherFamily} onChange={(e) => set("otherFamily", e.target.value)} />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-sm text-ink-muted">Optional. Anything you enter is saved as a reading taken now. You can skip this step.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Weight (kg)">
                      <input type="number" inputMode="decimal" className={inputClass} value={f.weight} onChange={(e) => set("weight", e.target.value)} />
                    </Field>
                    <Field label="Heart rate (bpm)">
                      <input type="number" inputMode="numeric" className={inputClass} value={f.heartRate} onChange={(e) => set("heartRate", e.target.value)} />
                    </Field>
                    <Field label="Blood pressure: systolic (top)">
                      <input type="number" inputMode="numeric" className={inputClass} value={f.systolic} onChange={(e) => set("systolic", e.target.value)} />
                    </Field>
                    <Field label="Blood pressure: diastolic (bottom)">
                      <input type="number" inputMode="numeric" className={inputClass} value={f.diastolic} onChange={(e) => set("diastolic", e.target.value)} />
                    </Field>
                    <Field label="Total cholesterol (mg/dL)">
                      <input type="number" inputMode="numeric" className={inputClass} value={f.cholesterol} onChange={(e) => set("cholesterol", e.target.value)} />
                    </Field>
                    <Field label="Blood glucose (mg/dL)">
                      <input type="number" inputMode="numeric" className={inputClass} value={f.glucose} onChange={(e) => set("glucose", e.target.value)} />
                    </Field>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <label className="flex items-center gap-2 text-ink">
                    <input type="checkbox" className="h-4 w-4 accent-action" checked={f.smoker} onChange={(e) => set("smoker", e.target.checked)} />
                    I smoke or use tobacco
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Alcohol">
                      <select className={inputClass} value={f.alcohol} onChange={(e) => set("alcohol", e.target.value as Form["alcohol"])}>
                        <option value="none">None</option>
                        <option value="light">Light (1–2 drinks a week)</option>
                        <option value="moderate">Moderate (3–7 drinks a week)</option>
                        <option value="heavy">Heavy (8+ drinks a week)</option>
                      </select>
                    </Field>
                    <Field label={`Days a week with 30+ minutes of activity: ${f.exerciseDaysPerWeek}`}>
                      <input type="range" min={0} max={7} className="w-full accent-action" value={f.exerciseDaysPerWeek} onChange={(e) => set("exerciseDaysPerWeek", e.target.value)} />
                    </Field>
                    <Field label="Typical diet" className="sm:col-span-2">
                      <input className={inputClass} value={f.diet} onChange={(e) => set("diet", e.target.value)} placeholder="Vegetarian, low salt…" />
                    </Field>
                    <Field label={`Stress level: ${f.stressLevel} of 10`} className="sm:col-span-2">
                      <input type="range" min={1} max={10} className="w-full accent-action" value={f.stressLevel} onChange={(e) => set("stressLevel", e.target.value)} />
                    </Field>
                  </div>
                </>
              )}
            </div>

          {stepError && (
            <p role="alert" className="mt-4 text-sm font-semibold text-danger">
              {stepError}
            </p>
          )}
          <ErrorText error={save.error ?? addVital.error} />

          <div className="mt-6 flex justify-between">
            <Button type="button" variant="secondary" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            {/* Distinct keys: otherwise React reuses the same <button> and the click that
                reaches the last step also submits the form, skipping the lifestyle step. */}
            {step < STEPS.length - 1 ? (
              <Button key="next" type="button" onClick={next}>
                Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button key="submit" type="submit" disabled={busy}>
                <Save className="h-4 w-4" aria-hidden="true" /> {busy ? "Saving…" : "Save profile"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
