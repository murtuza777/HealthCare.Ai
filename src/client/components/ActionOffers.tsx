import { useState } from "react";
import { Check } from "lucide-react";
import { READING_NAMES, readingText, type ProposedAction, type ProposedReading, type ProposedSymptom } from "../../shared/actions";
import { useAddSymptom, useAddVital } from "../lib/queries";
import { CriticalBanner } from "./CriticalBanner";
import { Button, ErrorText, StatusBadge } from "./ui";

// When a message to the assistant states a reading or a symptom, the app offers to save it.
// Nothing is saved until the patient presses Save; the offer comes from plain rules, not AI.

export function ActionOffers({ actions }: { actions: ProposedAction[] }) {
  if (!actions.length) return null;
  return (
    <ul className="max-w-prose space-y-3" aria-label="Save to your record">
      {actions.map((a) => (
        <li key={a.kind === "reading" ? a.type : `s:${a.type}`}>{a.kind === "reading" ? <ReadingOffer action={a} /> : <SymptomOffer action={a} />}</li>
      ))}
    </ul>
  );
}

const box = "rounded-control border border-line-strong bg-sheet px-4 py-3";

function Saved({ text, to }: { text: string; to: string }) {
  return (
    <p className="flex items-center gap-2 text-ink">
      <Check className="h-4 w-4 text-status-normal" aria-hidden="true" />
      {text} <span className="text-ink-muted">Saved to your {to}.</span>
    </p>
  );
}

function ReadingOffer({ action }: { action: ProposedReading }) {
  const add = useAddVital();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const label = `${READING_NAMES[action.type]} ${readingText(action)}`;
  if (add.data) {
    return (
      <div className="space-y-3">
        <div className={box}>
          <Saved text={label.charAt(0).toUpperCase() + label.slice(1)} to="readings" />
        </div>
        {add.data.classification === "critical" && <CriticalBanner kind="reading" />}
      </div>
    );
  }
  return (
    <div className={box}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Save <span className="font-[560]">{label}</span> to your readings?
        </span>
        <StatusBadge value={action.classification} />
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={add.isPending} onClick={() => add.mutate({ type: action.type, value: action.value, ...(action.value2 === undefined ? {} : { value2: action.value2 }) })}>
          {add.isPending ? "Saving" : "Save reading"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
      <ErrorText error={add.error} />
    </div>
  );
}

function SymptomOffer({ action }: { action: ProposedSymptom }) {
  const add = useAddSymptom();
  const [severity, setSeverity] = useState(5);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const name = action.type.charAt(0).toUpperCase() + action.type.slice(1);
  if (add.data) {
    return (
      <div className="space-y-3">
        <div className={box}>
          <Saved text={`${name}, ${severity}/10.`} to="symptoms" />
        </div>
        {add.data.redFlag.emergency && <CriticalBanner kind="symptom" reason={add.data.redFlag.reason} />}
      </div>
    );
  }
  return (
    <div className={box}>
      <p>
        Add <span className="font-[560]">{action.type}</span> to your symptoms?
      </p>
      <label className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        How bad is it?
        <input type="range" min={1} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-40 accent-ink" aria-valuetext={`${severity} out of 10`} />
        <span className="figures w-12 text-base text-ink">{severity}/10</span>
      </label>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={add.isPending} onClick={() => add.mutate({ type: action.type, severity, accompaniedBy: [] })}>
          {add.isPending ? "Saving" : "Save symptom"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
      <ErrorText error={add.error} />
    </div>
  );
}
