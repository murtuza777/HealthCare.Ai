import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { doseKeys, useAdherence, useDoses, useMarkDose, useMedications, usePushStatus } from "../lib/queries";
import { currentSubscription, disableReminders, enableReminders, pushSupported, sendTestReminder } from "../lib/push";
import { Button, ErrorText, Loading, SheetHeader } from "./ui";

// Today's medicines as a checklist, the last 7 days of adherence, and reminders on this device.

const STATUS_TEXT = { taken: "Taken", skipped: "Skipped", missed: "Missed", pending: "" } as const;

export function TodayDoses({ compact = false }: { compact?: boolean }) {
  const { data, isPending, error } = useDoses();
  const mark = useMarkDose();
  const meds = useMedications();
  const hasMedicines = (meds.data?.length ?? 0) > 0;

  return (
    <section>
      <SheetHeader
        title="Today's medicines"
        description={data?.items.length ? `${data.items.filter((d) => d.status === "taken").length} of ${data.items.length} taken` : undefined}
        action={
          compact && (
            <Link to="/app/medications" className="font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
              All medicines
            </Link>
          )
        }
      />
      {isPending && <Loading lines={2} />}
      <ErrorText error={error ?? mark.error} />
      {data && !data.items.length && (
        <p className="text-ink-muted">
          {hasMedicines ? "No doses are due today. A medicine added today starts from its next dose." : "Nothing scheduled today."}{" "}
          {compact && !hasMedicines && (
            <Link to="/app/medications" className="font-[540] text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Add a medicine
            </Link>
          )}
        </p>
      )}
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {data.items.map((d) => {
            const done = d.status === "taken" || d.status === "skipped";
            const at = new Date(d.scheduledAt);
            const busy = mark.isPending && mark.variables?.medicationId === d.medicationId && new Date(mark.variables.scheduledAt).getTime() === at.getTime();
            const set = (status: "taken" | "skipped" | "pending") => mark.mutate({ medicationId: d.medicationId, scheduledAt: at, status });
            return (
              <li key={`${d.medicationId}-${d.scheduledAt}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 py-3.5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
                <span className="figures w-14 shrink-0 text-ink-muted">{d.time}</span>
                <span className={`min-w-0 ${done ? "text-ink-muted" : ""}`}>
                  <span className={`font-[540] ${d.status === "taken" ? "line-through decoration-ink/30" : ""}`}>{d.name}</span>{" "}
                  <span className="text-ink-muted">{d.dose}</span>
                  {d.instructions && !compact && <span className="block text-sm text-ink-faint">{d.instructions}</span>}
                </span>
                {done ? (
                  <span className="col-start-2 flex items-center gap-2 sm:col-start-auto sm:justify-self-end">
                    <span className={`inline-flex items-center gap-2 text-sm ${d.status === "taken" ? "text-ink" : "text-ink-muted"}`}>
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${d.status === "taken" ? "bg-status-normal" : "bg-ink-faint"}`} />
                      {STATUS_TEXT[d.status]}
                    </span>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => set("pending")} aria-label={`Undo ${d.name} at ${d.time}`}>
                      Undo
                    </Button>
                  </span>
                ) : (
                  <span className="col-start-2 -ml-3 flex items-center gap-1.5 sm:col-start-auto sm:ml-0 sm:justify-self-end">
                    {d.status === "missed" && (
                      <span className="ml-3 mr-1 inline-flex items-center gap-2 text-sm text-ink-muted sm:ml-0">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-high" />
                        Missed
                      </span>
                    )}
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => set("skipped")} aria-label={`Skip ${d.name} at ${d.time}`}>
                      Skip
                    </Button>
                    <Button variant={d.status === "missed" ? "secondary" : "primary"} size="sm" disabled={busy} onClick={() => set("taken")} aria-label={`Mark ${d.name} at ${d.time} as taken`}>
                      Taken
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AdherenceWeek() {
  const { data, isPending } = useAdherence(7);
  if (isPending) return <Loading lines={1} />;
  if (!data || data.days.every((d) => d.scheduled === 0)) return null;
  const label = (date: string) => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
  };
  return (
    <section aria-labelledby="adherence-title">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="adherence-title" className="text-xl">
          Last 7 days
        </h2>
        {data.percent !== null && (
          <p className="text-ink-muted">
            <span className="reading text-2xl text-ink">{data.percent}%</span> of due doses taken
          </p>
        )}
      </div>
      <ol className="grid grid-cols-7 gap-2">
        {data.days.map((d) => {
          const share = d.scheduled ? d.taken / d.scheduled : 0;
          return (
            <li key={d.date} className="flex flex-col items-center gap-2">
              <span
                className="relative h-16 w-full overflow-hidden rounded-control bg-well"
                role="img"
                aria-label={`${label(d.date)}: ${d.taken} of ${d.scheduled} taken${d.missed ? `, ${d.missed} missed` : ""}${d.skipped ? `, ${d.skipped} skipped` : ""}`}
              >
                <span className="absolute inset-x-0 bottom-0 bg-ink transition-[height] duration-300 ease-out" style={{ height: `${share * 100}%` }} />
              </span>
              <span className="text-xs text-ink-muted">{label(d.date)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function RemindersSetting() {
  const { data: status } = usePushStatus();
  const qc = useQueryClient();
  const [on, setOn] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void currentSubscription().then((s) => alive && setOn(Boolean(s)));
    return () => {
      alive = false;
    };
  }, []);

  if (!pushSupported()) {
    return (
      <p className="text-sm text-ink-muted">
        This browser can't show reminders. On iPhone, add Healthcare.AI to your Home Screen first (Share, then Add to Home Screen), then open it from there.
      </p>
    );
  }
  if (status && !status.configured) return <p className="text-sm text-ink-muted">Reminders aren't switched on for this site yet.</p>;

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      if (on) {
        await disableReminders();
        setOn(false);
        setMessage("Reminders are off on this device.");
      } else {
        const r = await enableReminders(status!.publicKey!);
        if (r === "on") {
          setOn(true);
          setMessage("Reminders are on. You'll get a notification when each medicine is due.");
        } else if (r === "denied") setMessage("Notifications are blocked. Allow them for this site in your browser settings, then try again.");
        else setMessage("Couldn't switch reminders on. Try again.");
      }
      void qc.invalidateQueries({ queryKey: doseKeys.push });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-prose">
        <p className="font-[540]">Reminders on this device</p>
        <p className="mt-0.5 text-sm text-ink-muted">{message ?? "A notification when each medicine is due, with a button to mark it taken."}</p>
      </div>
      <div className="flex gap-2">
        {on && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => setMessage((await sendTestReminder()) ? "Test sent. It should arrive in a few seconds." : "Couldn't send a test.")}
          >
            Send a test
          </Button>
        )}
        <Button variant={on ? "secondary" : "primary"} size="sm" disabled={busy || on === null || !status} onClick={toggle} aria-pressed={Boolean(on)}>
          {on ? "Turn off" : "Turn on"}
        </Button>
      </div>
    </div>
  );
}
