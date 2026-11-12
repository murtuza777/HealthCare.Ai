import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Trash2 } from "lucide-react";
import { useAddReminder, useDeleteReminder, useReminders } from "../lib/queries";
import { localDateTime } from "../lib/format";
import { Button, ErrorText, Field, inputClass, Loading, SheetHeader } from "./ui";

// Appointments and one-off reminders. An appointment notifies the day before and two hours
// before (on devices with reminders turned on); a reminder notifies once, at its time.

const link = "font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink";

function when(iso: string | Date) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) })}, ${time}`;
}

export function ComingUp() {
  const { data, isPending, error } = useReminders();
  const del = useDeleteReminder();
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <SheetHeader
        title="Coming up"
        action={
          !adding && (
            <button className={link} onClick={() => setAdding(true)}>
              Add an appointment
            </button>
          )
        }
      />
      {adding && <AddReminder onDone={() => setAdding(false)} />}
      {isPending && <Loading lines={2} />}
      <ErrorText error={error ?? del.error} />
      {data && !data.length && !adding && <p className="text-ink-muted">No appointments or reminders. Add your next doctor's visit to be reminded the day before.</p>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="font-[540]">{r.title}</p>
                <p className="figures text-sm text-ink-muted">{when(r.dueAt)}</p>
              </div>
              {r.kind === "appointment" && (
                <Link to="/app/visit" className={`ml-auto shrink-0 text-sm ${link}`}>
                  Prepare a summary
                </Link>
              )}
              <button
                onClick={() => del.mutate(r.id)}
                disabled={del.isPending}
                aria-label={`Remove ${r.title}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddReminder({ onDone }: { onDone: () => void }) {
  const add = useAddReminder();
  const [kind, setKind] = useState<"appointment" | "custom">("appointment");
  const [title, setTitle] = useState("");
  // Default: tomorrow at 10:00.
  const [at, setAt] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(10, 0, 0, 0);
    return localDateTime(d);
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate({ kind, title: title.trim(), dueAt: new Date(at).toISOString() }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="mb-6 space-y-4 rounded-control bg-well p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr_1.4fr]">
        <Field label="Kind">
          <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as "appointment" | "custom")}>
            <option value="appointment">Appointment</option>
            <option value="custom">Reminder</option>
          </select>
        </Field>
        <Field label={kind === "appointment" ? "Who or what" : "Remind me to"}>
          <input
            required
            maxLength={120}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "appointment" ? "Dr Mehta, cardiology follow-up" : "Book a blood test"}
          />
        </Field>
        <Field label="When">
          <input type="datetime-local" required className={inputClass} value={at} min={localDateTime()} onChange={(e) => setAt(e.target.value)} />
        </Field>
      </div>
      <p className="text-sm text-ink-muted">
        {kind === "appointment" ? "You'll be reminded the day before and two hours before" : "You'll be reminded at this time"}, on devices where reminders are turned on.
      </p>
      <ErrorText error={add.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={add.isPending || !title.trim()}>
          {add.isPending ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}
