import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Check, Copy, Link2, QrCode, Share2 } from "lucide-react";
import { useCreateShare, useReports, useRevokeShare, useShares, type ShareNew } from "../lib/queries";
import { timeAgo, formatDay } from "../lib/format";
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
    <div className="space-y-14">
      <Link to="/app/reports" className="inline-flex items-center gap-1 text-sm font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to reports
      </Link>
      <PageHeader title="Share reports" subtitle="Create a link and QR code your doctor can open without an account. It stops working when it expires or you revoke it." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card boxed>
          <h2 className="text-xl">1. Choose what to share</h2>
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
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-well">
                        <input type="checkbox" className="h-4 w-4 accent-action" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                        <span>
                          <span className="font-medium">{r.title}</span>
                          <span className="block text-sm text-ink-muted">
                            {r.type}
                            {r.reportDate && `, ${formatDay(r.reportDate)}`}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-[540] text-ink">Link works for</legend>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <label key={d.value} className={`cursor-pointer select-none rounded-full px-4 py-1.5 text-sm font-[500] transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-action has-[:focus-visible]:ring-offset-2 ${expiresIn === d.value ? "border border-ink bg-ink text-white" : "border border-line-strong bg-sheet text-ink hover:border-ink/30"}`}>
                      <input type="radio" name="expires" className="sr-only" checked={expiresIn === d.value} onChange={() => setExpiresIn(d.value)} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-ink">
                <input type="checkbox" className="h-4 w-4 accent-action" checked={includeVitals} onChange={(e) => setIncludeVitals(e.target.checked)} />
                Also include my latest vital readings
              </label>
              <ErrorText error={create.error} />
              <Button type="submit" disabled={create.isPending || selected.length === 0}>
                <Link2 className="h-4 w-4" aria-hidden="true" /> {create.isPending ? "Creating…" : `Create link for ${selected.length || "…"} report${selected.length === 1 ? "" : "s"}`}
              </Button>
            </form>
          )}
        </Card>

        <Card boxed>
          <h2 className="text-xl">2. Show or send it</h2>
          {create.data ? <NewLink url={create.data.url} expiresAt={create.data.expiresAt} /> : <p className="mt-4 text-ink-muted">Your QR code and link will appear here.</p>}
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
      <div className="rounded-sheet border border-line bg-sheet p-3">
        <QRCodeSVG value={url} size={220} level="M" title="QR code for the share link" />
      </div>
      <p className="text-sm text-ink-muted">Works until {new Date(expiresAt).toLocaleString()}</p>
      <div className="flex w-full items-center gap-2 rounded-control border border-line bg-well p-2">
        <code className="flex-1 truncate text-left text-xs text-ink-muted">{url}</code>
        <Button variant="secondary" onClick={copy} aria-label="Copy link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        {"share" in navigator && (
          <Button variant="secondary" aria-label="Share link" onClick={() => void navigator.share({ title: "My medical reports", url })}>
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-sm text-ink-faint">Anyone with this link can view the selected reports until it expires. Only share it with people you trust.</p>
    </div>
  );
}

function ActiveLinks() {
  const { data, isPending } = useShares();
  const revoke = useRevokeShare();
  return (
    <Card>
      <h2 className="mb-4 text-xl">Your share links</h2>
      {isPending && <Loading />}
      {data?.length === 0 && <p className="text-ink-muted">You haven't shared anything yet.</p>}
      <ul className="divide-y divide-line border-y border-line">
        {data?.map((s) => (
          <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${s.active ? "" : "opacity-60"}`}>
            <div>
              <p className="font-medium">{s.reports.map((r) => r.title).join(", ") || "Reports deleted"}</p>
              <p className="text-sm text-ink-muted">
                Created {timeAgo(s.createdAt)}, opened {s.opens} time{s.opens === 1 ? "" : "s"}.{" "}
                {s.revokedAt ? "Revoked." : s.active ? `Works until ${new Date(s.expiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.` : "Expired."}
                {s.includeVitals && " Includes your latest readings."}
              </p>
            </div>
            {s.active && (
              <Button variant="danger-quiet" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
