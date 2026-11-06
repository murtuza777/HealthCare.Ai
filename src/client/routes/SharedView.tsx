import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, FileText, Link2Off } from "lucide-react";
import { publicApi } from "../lib/api";
import { formatReading, VITAL_LABELS } from "../lib/format";
import { Card, Loading, StatusBadge } from "../components/ui";
import { Shell } from "../components/Shell";

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
        <p className="text-lg font-bold">
          Healthcare<span className="text-red-500">.AI</span>
        </p>
        {q.isPending && <Loading label="Opening shared reports…" />}
        {q.data === null && (
          <Card className="mt-8 text-center">
            <Link2Off className="mx-auto h-12 w-12 text-red-400" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold">This link isn't available</h1>
            <p className="mt-2 text-gray-300">It may have expired or been revoked. Ask the patient to share a new one.</p>
          </Card>
        )}
        {q.data && (
          <div className="mt-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Reports shared by {q.data.patientName}</h1>
              <p className="text-gray-300">Read-only. This link works until {new Date(q.data.expiresAt).toLocaleString()}.</p>
            </div>

            {q.data.vitals && q.data.vitals.length > 0 && (
              <Card>
                <h2 className="mb-3 text-lg font-semibold">Latest readings</h2>
                <ul className="divide-y divide-white/10">
                  {q.data.vitals.map((v) => (
                    <li key={v.type} className="flex items-center justify-between gap-3 py-2">
                      <span>{VITAL_LABELS[v.type]}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums">{formatReading(v)}</span>
                        <StatusBadge value={v.classification} />
                        <span className="text-xs text-gray-400">{new Date(v.measuredAt).toLocaleDateString()}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <h2 className="mb-3 text-lg font-semibold">Reports</h2>
              <ul className="divide-y divide-white/10">
                {q.data.reports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 text-red-400" aria-hidden="true" />
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-sm text-gray-400">
                          {r.type}
                          {r.reportDate && ` · ${r.reportDate}`}
                          {(r.doctor || r.facility) && ` · ${[r.doctor, r.facility].filter(Boolean).join(", ")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={fileUrl(r.id)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
                        <Eye className="h-4 w-4" aria-hidden="true" /> View
                      </a>
                      <a href={fileUrl(r.id, true)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
                        <Download className="h-4 w-4" aria-hidden="true" /> Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="text-center text-xs text-gray-500">Shared by the patient through Healthcare.AI. Every opening of this link is recorded.</p>
          </div>
        )}
      </main>
    </Shell>
  );
}
