import { useState, type FormEvent } from "react";
import { Stethoscope, Trash2 } from "lucide-react";
import { detectRedFlags, SYMPTOM_TYPES, type RedFlag } from "../../shared/symptoms";
import { useAddSymptom, useDeleteSymptom, useSymptoms } from "../lib/queries";
import { timeAgo } from "../lib/format";
import { Button, Card, EmptyState, ErrorText, Field, inputClass, Loading, PageHeader } from "../components/ui";
import { CriticalBanner } from "../components/CriticalBanner";

const COMMON = SYMPTOM_TYPES.filter((t) => t !== "other");

export function Symptoms() {
  const [redFlag, setRedFlag] = useState<RedFlag | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Symptoms" subtitle="Log how you feel. Patterns help your doctor, and urgent combinations are flagged right away." />
      {redFlag?.emergency && <CriticalBanner kind="symptom" reason={redFlag.reason} />}
      <LogSymptom onSaved={setRedFlag} />
      <SymptomList />
    </div>
  );
}

function LogSymptom({ onSaved }: { onSaved: (r: RedFlag) => void }) {
  const add = useAddSymptom();
  const [type, setType] = useState<string>(COMMON[0]!);
  const [other, setOther] = useState("");
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState("");
  const [also, setAlso] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const mainType = type === "other" ? other.trim() : type;
  // Same rules as the server, so the warning appears before saving too.
  const livePreview = mainType ? detectRedFlags({ type: mainType, accompaniedBy: also, severity }) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate(
      {
        type: mainType,
        severity,
        accompaniedBy: also,
        ...(duration ? { durationMin: Number(duration) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          onSaved(res.redFlag);
          setAlso([]);
          setNote("");
          setDuration("");
        },
      },
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Log a symptom</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Main symptom">
            <select className={`${inputClass} capitalize`} value={type} onChange={(e) => setType(e.target.value)}>
              {SYMPTOM_TYPES.map((t) => (
                <option key={t} value={t} className="bg-gray-900 capitalize">
                  {t}
                </option>
              ))}
            </select>
          </Field>
          {type === "other" && (
            <Field label="Describe it">
              <input required className={inputClass} value={other} onChange={(e) => setOther(e.target.value)} />
            </Field>
          )}
          <Field label="How long? (minutes, optional)">
            <input type="number" min={0} inputMode="numeric" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
        </div>
        <Field label={`Severity: ${severity} of 10`}>
          <input type="range" min={1} max={10} className="w-full accent-red-600" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-200">Also feeling</legend>
          <div className="flex flex-wrap gap-2">
            {COMMON.filter((t) => t !== type).map((t) => (
              <label key={t} className={`cursor-pointer rounded-full px-3 py-1 text-sm capitalize ${also.includes(t) ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}`}>
                <input type="checkbox" className="sr-only" checked={also.includes(t)} onChange={() => setAlso(also.includes(t) ? also.filter((x) => x !== t) : [...also, t])} />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Notes (optional)">
          <textarea rows={2} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What were you doing when it started?" />
        </Field>
        {livePreview?.emergency && (
          <p role="alert" className="rounded-lg border border-red-500/50 bg-red-900/40 p-3 text-sm text-red-100">
            {livePreview.reason} If this is happening now, use the Emergency button or call your local emergency number.
          </p>
        )}
        <ErrorText error={add.error} />
        <div className="flex justify-end">
          <Button type="submit" disabled={add.isPending || !mainType}>
            {add.isPending ? "Saving…" : "Save symptom"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SymptomList() {
  const { data, isPending, error } = useSymptoms();
  const del = useDeleteSymptom();
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">History</h2>
      {isPending && <Loading />}
      <ErrorText error={error} />
      {data?.length === 0 && <EmptyState icon={<Stethoscope className="h-10 w-10" />} title="No symptoms logged" body="Symptoms you log will appear here." />}
      <ul className="divide-y divide-white/10">
        {data?.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-medium capitalize">
                {s.type} <span className="text-sm font-normal normal-case text-gray-400">· severity {s.severity}/10</span>
              </p>
              <p className="text-sm text-gray-400">
                {new Date(s.occurredAt).toLocaleString()} ({timeAgo(s.occurredAt)})
                {s.durationMin ? ` · ${s.durationMin} min` : ""}
              </p>
              {s.accompaniedBy.length > 0 && <p className="text-sm capitalize text-gray-400">With: {s.accompaniedBy.join(", ")}</p>}
              {s.note && <p className="text-sm text-gray-300">{s.note}</p>}
            </div>
            <Button
              variant="danger"
              aria-label={`Delete ${s.type} entry`}
              disabled={del.isPending}
              onClick={() => {
                if (confirm("Delete this symptom entry?")) del.mutate(s.id);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
