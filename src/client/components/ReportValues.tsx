import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Pencil, Trash2, X } from "lucide-react";
import { reportFileUrl, useDeleteFinding, useFindings, useReadReport, useSaveFinding, type Finding, type ReadOutcome, type Report } from "../lib/queries";
import { Button, Card, ErrorText, Field, inputClass, Loading } from "./ui";

// The values printed on a report, read by the AI model and checked by the patient. The model
// only copies what is printed; "low" and "high" come from the report's own reference range.

const REFUSED: Record<Exclude<ReadOutcome, "ok">, string> = {
  consent: "Reading a report sends it to the AI model, so it needs your agreement first.",
  quota: "You've used today's assistant questions. Reading a report counts as one; try again tomorrow.",
  unavailable: "The reader isn't available right now. Please try again in a little while.",
  unreadable: "No text could be found in this file. A sharper photo or the original PDF usually works better.",
  model: "The values couldn't be read from this report. You can try again, or add them yourself later.",
};

const range = (f: Pick<Finding, "refLow" | "refHigh">) =>
  f.refLow !== null && f.refHigh !== null ? `${f.refLow} to ${f.refHigh}` : f.refHigh !== null ? `up to ${f.refHigh}` : f.refLow !== null ? `${f.refLow} or more` : "";

function Flag({ flag }: { flag: Finding["flag"] }) {
  if (flag === "high" || flag === "low" || flag === "critical")
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-[560] text-ink">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-high" />
        {flag === "low" ? "Below range" : "Above range"}
      </span>
    );
  if (flag === "normal") return <span className="text-sm text-ink-muted">In range</span>;
  return <span className="text-sm text-ink-faint">No range printed</span>;
}

export function ReportValues({ report, onClose }: { report: Report; onClose: () => void }) {
  const findings = useFindings(report.id);
  const read = useReadReport();
  const [editing, setEditing] = useState<string | null>(null);
  const outcome = read.data;
  const hasRead = report.extractionStatus === "done";
  const items = findings.data ?? [];
  const outside = items.filter((f) => f.flag === "high" || f.flag === "low").length;

  return (
    <Card boxed>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Values in “{report.title}”</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Read by the AI model from your upload.{" "}
            <a href={reportFileUrl(report.id)} target="_blank" rel="noopener" className="font-[540] text-ink underline decoration-line-strong underline-offset-4">
              Open the report
            </a>{" "}
            to check them, and correct anything that's wrong.
          </p>
        </div>
        <button onClick={onClose} aria-label="Close values" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-well hover:text-ink">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {read.isPending ? (
        <div role="status">
          <Loading label="Reading the report" lines={4} />
          <p className="mt-3 text-sm text-ink-muted">Reading the report. This can take up to a minute.</p>
        </div>
      ) : (
        <>
          {outcome && outcome !== "ok" && (
            <p role="alert" className="mb-4 rounded-control bg-well px-4 py-3 text-ink">
              {REFUSED[outcome]}{" "}
              {outcome === "consent" && (
                <Link to="/app/assistant" className="font-[560] underline underline-offset-2">
                  Review and agree
                </Link>
              )}
            </p>
          )}

          {!hasRead ? (
            <div>
              <p className="max-w-prose text-ink-muted">
                The assistant can copy the test results out of this report, so they appear in your visit summary and it can answer questions about them. It counts as one of today's assistant questions.
              </p>
              <Button className="mt-4" onClick={() => read.mutate(report.id)}>
                Read this report
              </Button>
            </div>
          ) : findings.isPending ? (
            <Loading lines={3} />
          ) : (
            <>
              {report.summary && <p className="mb-4 max-w-prose text-ink">{report.summary}</p>}
              {items.length === 0 ? (
                <p className="text-ink-muted">No test results were found in this report.</p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-ink-muted">
                    {items.length} {items.length === 1 ? "result" : "results"}
                    {outside > 0 && `, ${outside} outside the range printed on the report`}.
                  </p>
                  <ul className="divide-y divide-line border-y border-line">
                    {items
                      .slice()
                      .sort((a, b) => Number(b.flag === "high" || b.flag === "low") - Number(a.flag === "high" || a.flag === "low"))
                      .map((f) =>
                        editing === f.id ? (
                          <li key={f.id} className="py-4">
                            <EditFinding reportId={report.id} finding={f} onDone={() => setEditing(null)} />
                          </li>
                        ) : (
                          <FindingRow key={f.id} reportId={report.id} finding={f} onEdit={() => setEditing(f.id)} />
                        ),
                      )}
                  </ul>
                </>
              )}
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => read.mutate(report.id)}>
                Read again
              </Button>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function FindingRow({ reportId, finding: f, onEdit }: { reportId: string; finding: Finding; onEdit: () => void }) {
  const del = useDeleteFinding(reportId);
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
      <div className="min-w-0">
        <p className="font-[540]">{f.test}</p>
        {range(f) && (
          <p className="text-sm text-ink-muted">
            Range {range(f)}
            {f.unit ? ` ${f.unit}` : ""}
          </p>
        )}
      </div>
      <p className="row-start-2 whitespace-nowrap sm:row-start-auto">
        <span className="reading text-xl">{f.value}</span>
        {f.unit && <span className="ml-1.5 text-sm text-ink-muted">{f.unit}</span>}
        {f.confirmedByUser && <span className="ml-2 text-xs text-ink-faint">checked by you</span>}
      </p>
      <div className="col-start-2 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
        <Flag flag={f.flag} />
      </div>
      <div className="col-start-2 row-start-2 flex justify-end gap-1 sm:col-start-auto sm:row-start-auto">
        <button onClick={onEdit} aria-label={`Correct ${f.test}`} className="grid h-9 w-9 place-items-center rounded-full text-ink-faint hover:bg-well hover:text-ink">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => del.mutate(f.id)}
          disabled={del.isPending}
          aria-label={`Remove ${f.test}`}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-faint hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function EditFinding({ reportId, finding: f, onDone }: { reportId: string; finding: Finding; onDone: () => void }) {
  const save = useSaveFinding(reportId);
  const [test, setTest] = useState(f.test);
  const [value, setValue] = useState(f.value);
  const [unit, setUnit] = useState(f.unit ?? "");
  const [low, setLow] = useState(f.refLow === null ? "" : String(f.refLow));
  const [high, setHigh] = useState(f.refHigh === null ? "" : String(f.refHigh));

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));
    save.mutate({ id: f.id, json: { test: test.trim(), value: value.trim(), unit: unit.trim() || null, refLow: n(low), refHigh: n(high) } }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Test">
          <input required maxLength={120} className={inputClass} value={test} onChange={(e) => setTest(e.target.value)} />
        </Field>
        <Field label="Result">
          <input required maxLength={60} className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Unit">
          <input maxLength={30} className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label="Range from" hint="As printed on the report">
          <input inputMode="decimal" className={inputClass} value={low} onChange={(e) => setLow(e.target.value)} />
        </Field>
        <Field label="Range to">
          <input inputMode="decimal" className={inputClass} value={high} onChange={(e) => setHigh(e.target.value)} />
        </Field>
      </div>
      <ErrorText error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
