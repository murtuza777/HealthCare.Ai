import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ok } from "../lib/api";
import { useSession } from "../lib/auth-client";
import { buttonClass, Card, inputClass } from "../components/Shell";
import { CANONICAL_UNITS, type Classification, type VitalType } from "../../shared/vitals";

// Minimal dashboard proving the full path (SPA → API → DAL → D1). The full dashboard is
// ported from legacy/app/dashboard in the UI-porting step.

const FORM_TYPES: { type: VitalType; label: string }[] = [
  { type: "blood_pressure", label: "Blood pressure" },
  { type: "heart_rate", label: "Heart rate" },
  { type: "spo2", label: "Oxygen (SpO₂)" },
  { type: "glucose", label: "Blood glucose" },
];

const LABELS: Record<VitalType, string> = {
  blood_pressure: "Blood pressure",
  heart_rate: "Heart rate",
  spo2: "Oxygen",
  weight: "Weight",
  glucose: "Glucose",
  temperature: "Temperature",
  cholesterol: "Cholesterol",
};

const BADGE: Record<Classification, string> = {
  normal: "bg-emerald-500/20 text-emerald-300",
  borderline: "bg-yellow-500/20 text-yellow-300",
  high: "bg-orange-500/20 text-orange-300",
  low: "bg-sky-500/20 text-sky-300",
  critical: "bg-red-600 text-white",
};

export function Dashboard() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [type, setType] = useState<VitalType>("blood_pressure");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");

  const vitals = useQuery({
    queryKey: ["vitals", "me"],
    queryFn: async () => (await ok(await api.patients[":patientId"].vitals.$get({ param: { patientId: "me" }, query: { limit: 20 } }))).items,
  });

  const add = useMutation({
    mutationFn: async () =>
      (
        await ok(
          await api.patients[":patientId"].vitals.$post({
            param: { patientId: "me" },
            json: { type, value: Number(value), ...(type === "blood_pressure" ? { value2: Number(value2) } : {}) },
          }),
        )
      ).vital,
    onSuccess: () => {
      setValue("");
      setValue2("");
      void queryClient.invalidateQueries({ queryKey: ["vitals", "me"] });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate();
  }

  const latestCritical = add.data?.classification === "critical";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hello{session?.user.name ? `, ${session.user.name}` : ""}</h1>

      {latestCritical && (
        <div role="alert" className="rounded-2xl border border-red-500 bg-red-600/90 p-5">
          <p className="text-lg font-semibold">This reading is in the emergency range.</p>
          <p className="mt-1">
            If you have chest pain, shortness of breath, fainting, or weakness on one side, call your local emergency
            number now. Otherwise, rest, measure again in 5 minutes, and contact your doctor.
          </p>
        </div>
      )}

      <Card>
        <h2 className="text-lg font-medium">Log a reading</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="text-sm text-gray-300">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as VitalType)} className={`mt-1 ${inputClass}`}>
              {FORM_TYPES.map((t) => (
                <option key={t.type} value={t.type} className="bg-gray-900">
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-300">
            {type === "blood_pressure" ? "Systolic (mmHg)" : `Value (${CANONICAL_UNITS[type]})`}
            <input required inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={`mt-1 ${inputClass}`} />
          </label>
          {type === "blood_pressure" ? (
            <label className="text-sm text-gray-300">
              Diastolic (mmHg)
              <input required inputMode="decimal" value={value2} onChange={(e) => setValue2(e.target.value)} className={`mt-1 ${inputClass}`} />
            </label>
          ) : (
            <div className="hidden sm:block" />
          )}
          <button type="submit" disabled={add.isPending} className={buttonClass}>
            {add.isPending ? "Saving…" : "Save"}
          </button>
        </form>
        {add.error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {add.error.message}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-medium">Recent readings</h2>
        {vitals.isPending && <p className="mt-4 text-gray-400">Loading…</p>}
        {vitals.error && <p className="mt-4 text-red-400">Couldn't load readings.</p>}
        {vitals.data?.length === 0 && <p className="mt-4 text-gray-400">No readings yet. Log your first one above.</p>}
        <ul className="mt-4 divide-y divide-white/10">
          {vitals.data?.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{LABELS[v.type]}</p>
                <p className="text-sm text-gray-400">{new Date(v.measuredAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">
                  {v.type === "blood_pressure" ? `${v.value}/${v.value2}` : v.value} {v.unit}
                </span>
                {v.classification && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[v.classification]}`}>{v.classification}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
