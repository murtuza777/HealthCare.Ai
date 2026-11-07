import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, Copy, Link2, QrCode, Share2 } from "lucide-react";
import { useCreateShare, useReports, useRevokeShare, useShares, type ShareNew } from "../lib/queries";
import { timeAgo } from "../lib/format";
import { Button, Card, EmptyState, ErrorText, Loading, PageHeader } from "../components/ui";

// Ported from legacy/app/reports/qr-code. Links now expire (1 hour / 24 hours / 7 days),
// can be revoked, and record how many times they were opened.

const DURATIONS: { value: ShareNew["expiresIn"]; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
];

export function ShareReports() {
  const reports = useReports();
  const create = useCreateShare();
  const [selected, setSelected] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<ShareNew["expiresIn"]>("24h");
  const [includeVitals, setIncludeVitals] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ reportIds: selected, expiresIn, includeVitals });
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-6">
      <Link to="/app/reports" className="inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to reports
      </Link>
      <PageHeader title="Share reports" subtitle="Create a link and QR code your doctor can open without an account. It stops working when it expires or you revoke it." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">1. Choose what to share</h2>
          {reports.isPending && <Loading />}
          {reports.data?.length === 0 && (
            <EmptyState icon={<QrCode className="h-10 w-10" />} title="No reports to share" body="Upload a report first." action={<Link to="/app/reports"><Button>Go to reports</Button></Link>} />
          )}
          {!!reports.data?.length && (
            <form onSubmit={submit} className="mt-4 space-y-5">
              <fieldset>
                <legend className="sr-only">Reports</legend>
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {reports.data.map((r) => (
                    <li key={r.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                        <input type="checkbox" className="h-4 w-4 accent-red-600" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                        <span>
                          <span className="font-medium">{r.title}</span>
                          <span className="block text-sm text-gray-400">
                            {r.type}
                            {r.reportDate && ` · ${r.reportDate}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-200">Link works for</legend>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <label key={d.value} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm ${expiresIn === d.value ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}`}>
                      <input type="radio" name="expires" className="sr-only" checked={expiresIn === d.value} onChange={() => setExpiresIn(d.value)} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-gray-200">
                <input type="checkbox" className="h-4 w-4 accent-red-600" checked={includeVitals} onChange={(e) => setIncludeVitals(e.target.checked)} />
                Also include my latest vital readings
              </label>
              <ErrorText error={create.error} />
              <Button type="submit" disabled={create.isPending || selected.length === 0}>
                <Link2 className="h-4 w-4" aria-hidden="true" /> {create.isPending ? "Creating…" : `Create link for ${selected.length || "…"} report${selected.length === 1 ? "" : "s"}`}
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">2. Show or send it</h2>
          {create.data ? <NewLink url={create.data.url} expiresAt={create.data.expiresAt} /> : <p className="mt-4 text-gray-400">Your QR code and link will appear here.</p>}
        </Card>
      </div>

      <ActiveLinks />
    </div>
  );
}

function NewLink({ url, expiresAt }: { url: string; expiresAt: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="mt-4 flex flex-col items-center gap-4 text-center">
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={url} size={220} level="M" title="QR code for the share link" />
      </div>
      <p className="text-sm text-gray-300">Works until {new Date(expiresAt).toLocaleString()}</p>
      <div className="flex w-full items-center gap-2 rounded-lg bg-black/30 p-2">
        <code className="flex-1 truncate text-left text-xs text-gray-300">{url}</code>
        <Button variant="secondary" onClick={copy} aria-label="Copy link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        {"share" in navigator && (
          <Button variant="secondary" aria-label="Share link" onClick={() => void navigator.share({ title: "My medical reports", url })}>
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">Anyone with this link can view the selected reports until it expires. Only share it with people you trust.</p>
    </div>
  );
}

function ActiveLinks() {
  const { data, isPending } = useShares();
  const revoke = useRevokeShare();
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Your share links</h2>
      {isPending && <Loading />}
      {data?.length === 0 && <p className="text-gray-400">You haven't shared anything yet.</p>}
      <ul className="divide-y divide-white/10">
        {data?.map((s) => (
          <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${s.active ? "" : "opacity-60"}`}>
            <div>
              <p className="font-medium">{s.reports.map((r) => r.title).join(", ") || "Reports deleted"}</p>
              <p className="text-sm text-gray-400">
                Created {timeAgo(s.createdAt)} · opened {s.opens} time{s.opens === 1 ? "" : "s"} ·{" "}
                {s.revokedAt ? "revoked" : s.active ? `expires ${new Date(s.expiresAt).toLocaleString()}` : "expired"}
                {s.includeVitals && " · includes vitals"}
              </p>
            </div>
            {s.active && (
              <Button variant="danger" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
