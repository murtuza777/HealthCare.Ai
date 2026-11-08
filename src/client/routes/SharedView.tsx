import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText, Link2Off } from "lucide-react";
import { publicApi } from "../lib/api";
import { formatReading, VITAL_LABELS, formatDay, formatDateTime } from "../lib/format";
import { Card, Loading, StatusBadge } from "../components/ui";
import { Shell, Wordmark } from "../components/Shell";

// Ported from legacy/app/reports/view-shared/[token]. Public: opened from the QR code, no account.

export function SharedView() {
  const { token = "" } = useParams();
  const q = useQuery({
    queryKey: ["public-share", token],
    retry: false,
    queryFn: async () => {
      const res = await publicApi.shares[":token"].$get({ param: { token } });
      if (!res.ok) return null; // unknown, expired and revoked all look the same
      return res.json();
    },
  });
  const fileUrl = (id: string, download = false) =>
    `/api/public/shares/${encodeURIComponent(token)}/reports/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;

  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Wordmark />
        {q.isPending && <Loading label="Opening shared reports…" />}
        {q.data === null && (
          <Card className="mt-8 text-center">
            <Link2Off className="mx-auto h-12 w-12 text-ink-faint" aria-hidden="true" />
            <h1 className="mt-4 text-2xl">This link isn't available</h1>
            <p className="mt-2 text-ink-muted">It may have expired or been revoked. Ask the patient to share a new one.</p>
          </Card>
        )}
        {q.data && (
          <div className="mt-10 space-y-14">
            <div>
              <h1 className="text-2xl font-[560]">Reports shared by {q.data.patientName}</h1>
              <p className="text-ink-muted">Read-only. This link works until {formatDateTime(q.data.expiresAt)}.</p>
            </div>

            {q.data.vitals && q.data.vitals.length > 0 && (
              <Card>
                <h2 className="mb-4 text-xl">Latest readings</h2>
                <ul className="divide-y divide-line border-y border-line">
                  {q.data.vitals.map((v) => (
                    <li key={v.type} className="flex items-center justify-between gap-3 py-2">
                      <span>{VITAL_LABELS[v.type]}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{formatReading(v)}</span>
                        <StatusBadge value={v.classification} />
                        <span className="text-xs text-ink-muted">{new Date(v.measuredAt).toLocaleDateString()}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <h2 className="mb-4 text-xl">Reports</h2>
              <ul className="divide-y divide-line border-y border-line">
                {q.data.reports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 text-ink-faint" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-ink-muted">
                          {r.type}
                          {r.reportDate && `, ${formatDay(r.reportDate)}`}
                          {(r.doctor || r.facility) && `. ${[r.doctor, r.facility].filter(Boolean).join(", ")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={fileUrl(r.id)} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-sheet px-3.5 text-sm font-[540] text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-well/60 active:scale-[0.97]">
                        <Eye className="h-4 w-4" aria-hidden="true" /> View
                      </a>
                      <a href={fileUrl(r.id, true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-sheet px-3.5 text-sm font-[540] text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-well/60 active:scale-[0.97]">
                        <Download className="h-4 w-4" aria-hidden="true" /> Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="text-center text-sm text-ink-faint">Shared by the patient through Healthcare.AI. Every opening of this link is recorded.</p>
          </div>
        )}
      </main>
    </Shell>
  );
}
