import { useMemo, useState } from "react";
import { readingsFromCsv, type CsvImport } from "../../shared/csv-import";
import type { VitalType } from "../../shared/vitals";
import { useImportVitals } from "../lib/queries";
import { VITAL_LABELS } from "../lib/format";
import { Button, Card, ErrorText } from "./ui";

// Bring in readings from a home monitor's export or a spreadsheet. The file is read in the
// browser; only the readings found are sent. Nothing is added until the patient confirms.

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const day = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** " (3 October)" or " (10 March)" for a date written 03/10/2026, so each choice shows what it means. */
function example(written: string | undefined, dayFirst: boolean) {
  const m = written?.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]/);
  if (!m) return "";
  const [d, mo] = dayFirst ? [Number(m[1]), Number(m[2])] : [Number(m[2]), Number(m[1])];
  return ` (${new Date(2024, mo - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long" })})`;
}

export function ImportReadings({ onClose }: { onClose: () => void }) {
  const send = useImportVitals();
  const [text, setText] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dayFirst, setDayFirst] = useState(true);

  const parsed: CsvImport | null = useMemo(() => (text === null ? null : readingsFromCsv(text, { dayFirst })), [text, dayFirst]);

  async function pick(file: File | undefined) {
    if (!file) return;
    send.reset();
    if (file.size > MAX_FILE_BYTES) return setFileError("That file is too large. Export a shorter period, up to 2 MB.");
    setFileError(null);
    setName(file.name);
    setText(await file.text());
  }

  const counts = new Map<VitalType, number>();
  for (const r of parsed?.readings ?? []) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  const times = (parsed?.readings ?? []).map((r) => r.measuredAt.getTime());

  return (
    <Card boxed>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl">Import readings from a file</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Use the CSV file your blood pressure monitor's app or a spreadsheet exports. It needs a Date column and columns such as Systolic, Diastolic, Pulse, Oxygen, Weight, Glucose or
            Temperature. The file stays on this device; only the readings are added to your record.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {send.data ? (
        <div className="mt-5">
          <p role="status" className="rounded-control bg-well px-4 py-3">
            {send.data.added === 0 ? "Nothing new was added." : `Added ${send.data.added} ${send.data.added === 1 ? "reading" : "readings"}.`}
            {send.data.duplicates > 0 && ` ${send.data.duplicates} ${send.data.duplicates === 1 ? "was" : "were"} already in your record.`}
          </p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <>
          <label className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-sheet px-5 font-[560] transition-colors hover:bg-well/60">
            {text === null ? "Choose a CSV file" : "Choose a different file"}
            <input type="file" accept=".csv,text/csv,text/plain,.txt,.tsv" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {name && <span className="ml-3 text-sm text-ink-muted">{name}</span>}
          {fileError && (
            <p role="alert" className="mt-3 text-sm font-[540] text-danger">
              {fileError}
            </p>
          )}

          {parsed?.problem && (
            <p role="alert" className="mt-4 max-w-prose rounded-control bg-well px-4 py-3">
              {parsed.problem}
            </p>
          )}

          {parsed && parsed.readings.length > 0 && (
            <div className="mt-5">
              <p className="font-[540]">
                Found {parsed.readings.length} {parsed.readings.length === 1 ? "reading" : "readings"}, from {day(new Date(Math.min(...times)))} to {day(new Date(Math.max(...times)))}.
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink-muted">
                {[...counts].map(([type, n]) => (
                  <li key={type}>
                    {VITAL_LABELS[type]}: <span className="figures text-ink">{n}</span>
                  </li>
                ))}
              </ul>
              {parsed.skipped > 0 && (
                <p className="mt-2 text-sm text-ink-muted">
                  {parsed.skipped} {parsed.skipped === 1 ? "row" : "rows"} had no readable date or reading and will be left out.
                </p>
              )}
              {parsed.ambiguousDates && (
                <fieldset className="mt-4 rounded-control bg-well p-4">
                  <legend className="sr-only">Date format</legend>
                  <p className="text-sm text-ink">
                    Some dates could be read two ways{parsed.ambiguousExample ? `, such as ${parsed.ambiguousExample}` : ""}. Which comes first in this file?
                  </p>
                  <div className="mt-2 flex flex-wrap gap-5">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="dayfirst" checked={dayFirst} onChange={() => setDayFirst(true)} className="accent-ink" /> The day{example(parsed.ambiguousExample, true)}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="dayfirst" checked={!dayFirst} onChange={() => setDayFirst(false)} className="accent-ink" /> The month{example(parsed.ambiguousExample, false)}
                    </label>
                  </div>
                </fieldset>
              )}
              <p className="mt-4 max-w-prose text-sm text-ink-muted">Readings already in your record are skipped, so importing the same file twice is safe. Imported readings don't alert your care team.</p>
              <ErrorText error={send.error} />
              <Button className="mt-4" disabled={send.isPending} onClick={() => send.mutate(parsed.readings)}>
                {send.isPending ? "Adding readings" : `Add ${parsed.readings.length} ${parsed.readings.length === 1 ? "reading" : "readings"}`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
