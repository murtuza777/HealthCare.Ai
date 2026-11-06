import { useState, type FormEvent } from "react";
import { Pill, Plus, Trash2, X } from "lucide-react";
import { useAddMedication, useDeleteMedication, useMedications, useSetMedicationActive } from "../lib/queries";
import { Button, Card, EmptyState, ErrorText, Field, inputClass, Loading, PageHeader } from "../components/ui";
import { localDate } from "../lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const today = () => localDate();

export function Medications() {
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data, isPending, error } = useMedications(showAll);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medications"
        subtitle="Keep your medicine list and schedule up to date. Reminders arrive in a later update."
        action={
          !adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add medication
            </Button>
          )
        }
      />
      {adding && <AddMedication onDone={() => setAdding(false)} />}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{showAll ? "All medications" : "Current medications"}</h2>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" className="accent-red-600" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show stopped
          </label>
        </div>
        {isPending && <Loading />}
        <ErrorText error={error} />
        {data?.length === 0 && (
          <EmptyState icon={<Pill className="h-10 w-10" />} title="No medications yet" body="Add the medicines you take so your doctor, caretakers and the assistant have the full picture." />
        )}
        <ul className="divide-y divide-white/10">
          {data?.map((m) => <MedicationRow key={m.id} m={m} />)}
        </ul>
      </Card>
    </div>
  );
}

function MedicationRow({ m }: { m: NonNullable<ReturnType<typeof useMedications>["data"]>[number] }) {
  const setActive = useSetMedicationActive();
  const del = useDeleteMedication();
  const days = m.schedule.days?.length ? m.schedule.days.map((d) => DAYS[d]).join(", ") : "Every day";
  return (
    <li className={`flex flex-wrap items-center justify-between gap-3 py-3 ${m.active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <Pill className="mt-1 h-5 w-5 text-red-400" aria-hidden="true" />
        <div>
          <p className="font-medium">
            {m.name} <span className="text-gray-400">{m.dose}</span>
            {m.form && <span className="text-sm text-gray-500"> · {m.form}</span>}
            {!m.active && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">Stopped</span>}
          </p>
          <p className="text-sm text-gray-400">
            {m.schedule.times.join(", ")} · {days} · since {m.startDate}
            {m.endDate && ` until ${m.endDate}`}
          </p>
          {m.instructions && <p className="text-sm text-gray-400">{m.instructions}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={setActive.isPending} onClick={() => setActive.mutate({ id: m.id, active: !m.active })}>
          {m.active ? "Mark stopped" : "Resume"}
        </Button>
        <Button
          variant="danger"
          aria-label={`Delete ${m.name}`}
          disabled={del.isPending}
          onClick={() => {
            if (confirm(`Delete ${m.name}? Use "Mark stopped" instead to keep it in your history.`)) del.mutate(m.id);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function AddMedication({ onDone }: { onDone: () => void }) {
  const add = useAddMedication();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [form, setForm] = useState("");
  const [instructions, setInstructions] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [everyDay, setEveryDay] = useState(true);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate(
      {
        name: name.trim(),
        dose: dose.trim(),
        ...(form.trim() ? { form: form.trim() } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        schedule: { times: [...new Set(times)].sort(), ...(everyDay ? {} : { days }) },
        startDate,
        endDate: endDate || null,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Add a medication</h2>
        <button onClick={onDone} aria-label="Cancel" className="text-gray-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name">
            <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Atorvastatin" />
          </Field>
          <Field label="Dose">
            <input required className={inputClass} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="20 mg" />
          </Field>
          <Field label="Form (optional)">
            <input className={inputClass} value={form} onChange={(e) => setForm(e.target.value)} placeholder="Tablet" />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-200">Times</legend>
          <div className="flex flex-wrap items-center gap-2">
            {times.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                <input
                  type="time"
                  required
                  aria-label={`Time ${i + 1}`}
                  className={`${inputClass} w-32`}
                  value={t}
                  onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {times.length > 1 && (
                  <button type="button" aria-label={`Remove time ${i + 1}`} onClick={() => setTimes(times.filter((_, j) => j !== i))} className="text-gray-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </span>
            ))}
            {times.length < 8 && (
              <Button type="button" variant="secondary" onClick={() => setTimes([...times, "20:00"])}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add time
              </Button>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-200">Days</legend>
          <label className="flex items-center gap-2 text-gray-200">
            <input type="checkbox" className="accent-red-600" checked={everyDay} onChange={(e) => setEveryDay(e.target.checked)} /> Every day
          </label>
          {!everyDay && (
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <label key={d} className={`cursor-pointer rounded-full px-3 py-1 text-sm ${days.includes(i) ? "bg-red-600" : "bg-white/10"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={days.includes(i)}
                    onChange={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
                  />
                  {d}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Start date">
            <input type="date" required className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date (optional)">
            <input type="date" className={inputClass} value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field label="Instructions (optional)">
            <input className={inputClass} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="With food" />
          </Field>
        </div>

        <ErrorText error={add.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={add.isPending || (!everyDay && days.length === 0)}>
            {add.isPending ? "Saving…" : "Save medication"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
