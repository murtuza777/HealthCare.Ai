import { useState } from "react";
import { useSearchParams } from "react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Activity, Bell, FileText, Pill, Stethoscope, type LucideIcon } from "lucide-react";
import { TIMELINE_KINDS, type TimelineKind } from "../../shared/timeline";
import type { VitalType } from "../../shared/vitals";
import { api, ok } from "../lib/api";
import { VITAL_LABELS } from "../lib/format";
import { Button, EmptyState, ErrorText, Loading, PageHeader, StatusBadge } from "../components/ui";

// Everything in the record in one place, newest first: what a doctor asks for as "the history".

const KIND: Record<TimelineKind, { label: string; icon: LucideIcon }> = {
  vital: { label: "Readings", icon: Activity },
  symptom: { label: "Symptoms", icon: Stethoscope },
  dose: { label: "Medicines", icon: Pill },
  report: { label: "Reports", icon: FileText },
  alert: { label: "Alerts", icon: Bell },
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
      <PageHeader title="History" subtitle="Every reading, symptom, dose, report and alert, newest first." />

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
                  const Icon = KIND[item.kind].icon;
                  const title = item.kind === "vital" ? VITAL_LABELS[item.title as VitalType] ?? item.title : item.title;
                  const detail = item.kind === "dose" ? DOSE_TEXT[item.detail] ?? item.detail : item.detail;
                  return (
                    <li key={item.id} className="flex gap-4 py-4">
                      <span
                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.tone === "critical" ? "bg-danger-soft text-danger" : "bg-well text-ink-muted"}`}
                      >
                        <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-[540] first-letter:uppercase">{title}</span>
                          <span className="figures text-sm text-ink-faint">{time(item.at)}</span>
                        </p>
                        <p className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 ${item.tone === "critical" ? "text-danger" : item.tone === "attention" ? "text-ink" : "text-ink-muted"}`}>
                          <span className={item.kind === "vital" ? "figures text-ink" : "first-letter:uppercase"}>{detail}</span>
                          {item.status && <StatusBadge value={item.status} />}
                        </p>
                        {item.note && <p className="mt-1 text-sm text-ink-muted">{item.note}</p>}
                      </div>
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
