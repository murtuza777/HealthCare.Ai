import { useState, type FormEvent } from "react";
import { Activity } from "lucide-react";
import { CANONICAL_UNITS, classifyVital, type VitalType } from "../../shared/vitals";
import { useAddVital, useVitals } from "../lib/queries";
import { formatReading, localDateTime, VITAL_LABELS } from "../lib/format";
import { Button, Card, EmptyState, ErrorText, Field, inputClass, Loading, PageHeader, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";
import { CriticalBanner } from "../components/CriticalBanner";

const TYPES: VitalType[] = ["blood_pressure", "heart_rate", "spo2", "glucose", "weight", "temperature", "cholesterol"];

export function Vitals() {
  const [type, setType] = useState<VitalType>("blood_pressure");
  return (
    <div className="space-y-6">
      <PageHeader title="Vitals" subtitle="Log a reading and see how it changes over time." />
      <LogReading type={type} onTypeChange={setType} />
      <History type={type} />
    </div>
  );
}

function LogReading({ type, onTypeChange }: { type: VitalType; onTypeChange: (t: VitalType) => void }) {
  const add = useAddVital();
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const [measuredAt, setMeasuredAt] = useState("");
  const isBp = type === "blood_pressure";

  // Instant preview with the same rules the server uses.
  const preview = value && (!isBp || value2) ? classifyVital(type, Number(value), isBp ? Number(value2) : undefined) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate(
      {
        type,
        value: Number(value),
        ...(isBp ? { value2: Number(value2) } : {}),
        ...(measuredAt ? { measuredAt: new Date(measuredAt) } : {}), // sent as an ISO string
      },
      {
        onSuccess: () => {
          setValue("");
          setValue2("");
          setMeasuredAt("");
        },
      },
    );
  }

  return (
    <>
      {add.data?.classification === "critical" && <CriticalBanner kind="reading" />}
      <Card>
        <h2 className="text-lg font-semibold">Log a reading</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Field label="Type">
            <select value={type} onChange={(e) => onTypeChange(e.target.value as VitalType)} className={inputClass}>
              {TYPES.map((t) => (
                <option key={t} value={t} className="bg-gray-900">
                  {VITAL_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={isBp ? "Systolic (top, mmHg)" : `Value (${CANONICAL_UNITS[type]})`}>
            <input required type="number" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} />
          </Field>
          {isBp ? (
            <Field label="Diastolic (bottom, mmHg)">
              <input required type="number" step="any" inputMode="decimal" value={value2} onChange={(e) => setValue2(e.target.value)} className={inputClass} />
            </Field>
          ) : (
            <div className="hidden lg:block" />
          )}
          <Field label="Taken at" hint="Leave empty for now.">
            <input type="datetime-local" value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} max={localDateTime()} className={inputClass} />
          </Field>
          <Button type="submit" disabled={add.isPending} className="h-10">
            {add.isPending ? "Saving…" : "Save reading"}
          </Button>
        </form>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          {preview && (
            <>
              This reading looks: <StatusBadge value={preview} />
            </>
          )}
        </div>
        <ErrorText error={add.error} />
      </Card>
    </>
  );
}

function History({ type }: { type: VitalType }) {
  const { data, isPending, error } = useVitals(type, 100);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">{VITAL_LABELS[type]} trend</h2>
        {isPending ? <Loading /> : <TrendChart points={data ?? []} unit={CANONICAL_UNITS[type]} dual={type === "blood_pressure"} height={260} />}
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">History</h2>
        {isPending && <Loading />}
        <ErrorText error={error} />
        {data?.length === 0 && (
          <EmptyState icon={<Activity className="h-10 w-10" />} title="No readings yet" body={`Your ${VITAL_LABELS[type].toLowerCase()} readings will appear here.`} />
        )}
        <ul className="max-h-80 divide-y divide-white/10 overflow-y-auto">
          {data?.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-gray-400">{new Date(v.measuredAt).toLocaleString()}</span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{formatReading(v)}</span>
                <StatusBadge value={v.classification} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
