import { useState, type FormEvent } from "react";
import { Stethoscope, Trash2 } from "lucide-react";
import { detectRedFlags, SYMPTOM_TYPES, type RedFlag } from "../../shared/symptoms";
import { useAddSymptom, useDeleteSymptom, useSymptoms, useSymptomsLast7Days } from "../lib/queries";
import { formatDateTime, localDateTime, timeAgo } from "../lib/format";
import { Button, Card, EmptyState, ErrorText, Field, inputClass, Loading, PageHeader } from "../components/ui";
import { CriticalBanner } from "../components/CriticalBanner";

const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const COMMON = SYMPTOM_TYPES.filter((t) => t !== "other");

export function Symptoms() {
  const [redFlag, setRedFlag] = useState<RedFlag | null>(null);
  return (
    <div className="space-y-14">
      <PageHeader title="Symptoms" subtitle="Log how you feel. Patterns help your doctor, and urgent combinations are flagged right away." />
      {redFlag?.emergency && <CriticalBanner kind="symptom" reason={redFlag.reason} />}
      <LogSymptom onSaved={setRedFlag} />
      <SymptomList />
    </div>
  );
}

function LogSymptom({ onSaved }: { onSaved: (r: RedFlag) => void }) {
  const add = useAddSymptom();
  // Nothing is preselected: saving in a hurry must never log "chest pain" by accident.
  const [type, setType] = useState<string>("");
  const [when, setWhen] = useState("");
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState("");
  const [also, setAlso] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const mainType = type.trim();
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
        ...(when ? { occurredAt: new Date(when) } : {}),
      },
      {
        onSuccess: (res) => {
          onSaved(res.redFlag);
          setAlso([]);
          setNote("");
          setDuration("");
          setWhen("");
          setType("");
          setSeverity(5);
        },
      },
    );
  }

  return (
    <Card boxed>
      <h2 className="text-xl">Log a symptom</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Symptom">
            <input required maxLength={100} list="symptom-types" autoComplete="off" className={inputClass} value={type} onChange={(e) => setType(e.target.value)} placeholder="Choose or describe" />
            <datalist id="symptom-types">
              {COMMON.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="How long? (minutes, optional)">
            <input type="number" min={0} max={43200} inputMode="numeric" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="When? (optional)" hint="Leave empty for now">
            <input type="datetime-local" className={inputClass} value={when} max={localDateTime()} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <Field label={`Severity: ${severity} of 10`}>
          <input type="range" min={1} max={10} className="w-full accent-ink" value={severity} onChange={(e) => setSeverity(Number(e.target.value))} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-[540] text-ink">Also feeling</legend>
          <div className="flex flex-wrap gap-2">
            {COMMON.filter((t) => t !== mainType).map((t) => (
              <label key={t} className={`cursor-pointer select-none rounded-full px-3.5 py-1.5 text-sm font-[500] transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action has-[:focus-visible]:ring-offset-2 ${also.includes(t) ? "border border-ink bg-ink text-white" : "border border-line-strong bg-sheet text-ink hover:border-ink/30"}`}>
                <input type="checkbox" className="sr-only" checked={also.includes(t)} onChange={() => setAlso(also.includes(t) ? also.filter((x) => x !== t) : [...also, t])} />
                {sentence(t)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Notes (optional)">
          <textarea rows={2} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What were you doing when it started?" />
        </Field>
        {livePreview?.emergency && (
          <p role="alert" className="rounded-control bg-danger-soft p-3.5 text-sm font-[540] text-danger">
            {livePreview.reason} If this is happening now, use the Emergency button or call your local emergency number.
          </p>
        )}
        <ErrorText error={add.error} />
        <div className="flex justify-end">
          <Button type="submit" disabled={add.isPending || !mainType}>
            {add.isPending ? "Saving…" : "Log"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SymptomList() {
  const { data, isPending, error } = useSymptoms();
  const last7Days = useSymptomsLast7Days().data;
  const del = useDeleteSymptom();
  return (
    <Card>
      <h2 className="mb-4 text-xl">History</h2>
      {isPending && <Loading />}
      <ErrorText error={error} />
      {last7Days !== undefined && (
        <p className="mb-4 text-ink-muted" aria-live="polite">
          {last7Days === 0 ? "No symptoms logged in the last 7 days." : `${last7Days} ${last7Days === 1 ? "symptom" : "symptoms"} logged in the last 7 days.`}
        </p>
      )}
      {data?.length === 0 && <EmptyState icon={<Stethoscope className="h-10 w-10" />} title="No symptoms logged" body="Symptoms you log will appear here." />}
      <ul className="divide-y divide-line border-y border-line">
        {data?.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-[540] first-letter:uppercase">
                {s.type}, <span className="figures">severity {s.severity}/10</span>
              </p>
              <p className="text-sm text-ink-muted">
                {formatDateTime(s.occurredAt)} ({timeAgo(s.occurredAt)})
                {s.durationMin ? `, lasted ${s.durationMin} min` : ""}
              </p>
              {s.accompaniedBy.length > 0 && <p className="text-sm text-ink-muted">Also: {s.accompaniedBy.join(", ")}</p>}
              {s.note && <p className="text-sm text-ink-muted">{s.note}</p>}
            </div>
            <Button variant="danger-quiet" disabled={del.isPending} onClick={() => del.mutate(s.id)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Delete {s.type}</span>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
