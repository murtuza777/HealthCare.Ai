import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TIMELINE_KINDS, type TimelineKind } from "../../shared/timeline";
import type { VitalType } from "../../shared/vitals";
import { api, ok } from "../lib/api";
import { usePatientsCaredFor } from "../lib/care";
import { VITAL_LABELS } from "../lib/format";
import { Button, EmptyState, ErrorText, Loading, PageHeader, StatusBadge } from "../components/ui";

// Everything in the record in one place, newest first: what a doctor asks for as "the history".

const KIND: Record<TimelineKind, { label: string; one: string }> = {
  vital: { label: "Readings", one: "Reading" },
  symptom: { label: "Symptoms", one: "Symptom" },
  dose: { label: "Medicines", one: "Medicine" },
  report: { label: "Reports", one: "Report" },
  alert: { label: "Alerts", one: "Alert" },
};

const DOSE_TEXT: Record<string, string> = { taken: "Taken", skipped: "Skipped", missed: "Missed" };

function useTimeline(patientId: string, kinds: TimelineKind[]) {
  return useInfiniteQuery({
    queryKey: ["timeline", patientId, kinds.join(",")],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      ok(await api.patients[":patientId"].timeline.$get({ param: { patientId }, query: { before: pageParam, kinds: kinds.length ? kinds.join(",") : undefined } })),
    getNextPageParam: (last) => last.next ?? undefined,
  });
}

const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }) });
}
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export function Timeline() {
  const [params] = useSearchParams();
  const patientId = params.get("p") || "me";
  const [kinds, setKinds] = useState<TimelineKind[]>([]);
  // A caretaker looking at someone else's history sees whose it is, and a way back.
  const cared = usePatientsCaredFor();
  const other = patientId === "me" ? null : cared.data?.find((p) => p.patientId === patientId);
  const first = other?.name.split(" ")[0] || other?.name;
  const q = useTimeline(patientId, kinds);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  const days: { key: string; label: string; items: typeof items }[] = [];
  for (const item of items) {
    const key = dayKey(item.at);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(item);
    else days.push({ key, label: dayLabel(item.at), items: [item] });
  }

  const toggle = (k: TimelineKind) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <div>
      {other && (
        <p className="mb-2 text-sm text-ink-muted">
          <Link to={`/app/care/${patientId}`} className="hover:text-ink">
            {other.name}
          </Link>
        </p>
      )}
      <PageHeader
        title={first ? `${first}'s history` : "History"}
        subtitle={first ? `What ${first} has chosen to share with you, newest first.` : "Every reading, symptom, dose, report and alert, newest first."}
      />

      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Show">
        {TIMELINE_KINDS.map((k) => {
          const on = kinds.includes(k);
          return (
            <button
              key={k}
              aria-pressed={on}
              onClick={() => toggle(k)}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-[0.9375rem] transition-colors ${on ? "border-ink bg-ink text-white" : "border-line-strong text-ink-muted hover:text-ink"}`}
            >
              {KIND[k].label}
            </button>
          );
        })}
      </div>

      {q.isPending ? (
        <Loading label="Loading history" lines={6} />
      ) : q.isError ? (
        <ErrorText error={q.error} />
      ) : !items.length ? (
        <EmptyState title="Nothing here yet" body={kinds.length ? "Nothing of this kind has been recorded." : "Readings, symptoms, doses and reports appear here as they're recorded."} />
      ) : (
        <div className="space-y-10">
          {days.map((day) => (
            <section key={day.key} aria-label={day.label}>
              <h2 className="mb-1 text-sm font-[540] text-ink-faint">{day.label}</h2>
              <ul className="divide-y divide-line border-y border-line">
                {day.items.map((item) => {
                  const title = item.kind === "vital" ? VITAL_LABELS[item.title as VitalType] ?? item.title : item.title;
                  const detail = item.kind === "dose" ? DOSE_TEXT[item.detail] ?? item.detail : item.detail;
                  return (
                    <li key={item.id} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-4 py-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_6rem]">
                      <span className="figures pt-0.5 text-sm text-ink-faint">{time(item.at)}</span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span className={`font-[540] first-letter:uppercase ${item.tone === "critical" ? "text-danger" : ""}`}>{title}</span>
                          {item.kind === "vital" ? (
                            <>
                              <span className="figures">{detail}</span>
                              {item.status && <StatusBadge value={item.status} />}
                            </>
                          ) : item.kind === "dose" ? (
                            <span className={`inline-flex items-center gap-2 text-sm ${item.tone === "attention" ? "text-ink" : "text-ink-muted"}`}>
                              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${detail === "Taken" ? "bg-status-normal" : detail === "Missed" ? "bg-status-high" : "bg-ink-faint"}`} />
                              {detail}
                            </span>
                          ) : null}
                        </p>
                        {item.kind !== "vital" && item.kind !== "dose" && <p className="mt-0.5 max-w-prose text-ink-muted first-letter:uppercase">{detail}</p>}
                        {item.note && <p className="mt-0.5 max-w-prose text-sm text-ink-muted">{item.note}</p>}
                      </div>
                      <span className="hidden pt-0.5 text-right text-sm text-ink-faint sm:block">{KIND[item.kind].one}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {q.hasNextPage && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage ? "Loading" : "Show earlier"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
