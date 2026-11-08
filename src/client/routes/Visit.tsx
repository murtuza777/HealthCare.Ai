import { useState, type ReactNode } from "react";
import { ageFrom } from "../../shared/risk";
import type { VitalType } from "../../shared/vitals";
import { useAdherence, useLatestVitals, useMedications, useProfile, useSymptoms, useVitals } from "../lib/queries";
import { useAssistantStatus } from "../lib/assistant";
import { formatReading, VITAL_LABELS } from "../lib/format";
import { Button, inputClass, Loading, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";

// A one-page summary to take to an appointment. The browser prints it (or saves it as PDF),
// so no PDF work runs on the server. Questions can be suggested by the assistant and edited.

const DAY = 86400000;
const ROWS: VitalType[] = ["blood_pressure", "heart_rate", "spo2", "glucose", "cholesterol", "weight"];
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function stats(points: { value: number; value2: number | null; measuredAt: string }[], since: number) {
  const recent = points.filter((p) => +new Date(p.measuredAt) >= since);
  if (!recent.length) return null;
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const v1 = recent.map((p) => p.value);
  const v2 = recent.map((p) => p.value2 ?? 0);
  return { count: recent.length, avg: [avg(v1), avg(v2)], min: [Math.min(...v1), Math.min(...v2)], max: [Math.max(...v1), Math.max(...v2)], points: recent };
}

export function Visit() {
  const profile = useProfile();
  const latest = useLatestVitals();
  const meds = useMedications();
  const adherence = useAdherence(30);
  const symptoms = useSymptoms();
  const bp = useVitals("blood_pressure", 200);
  const hr = useVitals("heart_rate", 200);
  const ai = useAssistantStatus();
  const [questions, setQuestions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [suggesting, setSuggesting] = useState<string | null>(null);
  // Fixed when the page opens, so the 30-day window doesn't shift while it's on screen.
  const [since] = useState(() => Date.now() - 30 * DAY);

  if (profile.isPending || latest.isPending || meds.isPending) return <Loading label="Preparing your summary" lines={6} />;
  const p = profile.data;
  const l = latest.data ?? {};
  const age = ageFrom(p?.dateOfBirth);
  const bpStats = stats(bp.data ?? [], since);
  const hrStats = stats(hr.data ?? [], since);
  const recentSymptoms = (symptoms.data ?? []).filter((s) => +new Date(s.occurredAt) >= since);

  async function suggest() {
    setSuggesting("Thinking…");
    const res = await fetch("/api/v1/assistant/visit-questions", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { kind?: string; questions?: string[] };
    if (body.kind === "ok" && body.questions) {
      setQuestions((q) => [...q, ...body.questions!.filter((x) => !q.includes(x))]);
      setSuggesting(null);
    } else if (body.kind === "consent") setSuggesting("Open the Assistant once to agree to how it uses your record, then try again.");
    else if (body.kind === "quota") setSuggesting("You've used today's assistant questions. Add your own below.");
    else setSuggesting("The assistant isn't available right now. Add your own questions below.");
  }

  return (
    <article className="visit mx-auto max-w-3xl space-y-12 print:max-w-none print:space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm text-ink-muted">Visit summary, {fmtDate(new Date())}</p>
          <h1 className="mt-2 text-3xl font-light sm:text-4xl">{p?.name || "Your summary"}</h1>
          <p className="mt-2 text-ink-muted">
            {[age !== null && `${age} years`, p?.sex && p.sex !== "unspecified" && p.sex, p?.heightCm && `${p.heightCm} cm`, p?.dateOfBirth && `born ${fmtDate(p.dateOfBirth)}`]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => window.print()}>Print or save as PDF</Button>
        </div>
      </header>

      <Block title="Health history">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Item label="Conditions">{p?.conditions?.length ? p.conditions.join(", ") : "None recorded"}</Item>
          <Item label="Heart attack">{p?.hadHeartAttack ? `Yes${p.lastHeartAttackAt ? `, most recent ${fmtDate(p.lastHeartAttackAt)}` : ""}` : "No"}</Item>
          <Item label="Allergies">{p?.allergies?.length ? p.allergies.join(", ") : "None recorded"}</Item>
          <Item label="Family history">{p?.familyHistory?.length ? p.familyHistory.join(", ") : "None recorded"}</Item>
          {p?.lifestyle && (
            <Item label="Lifestyle">
              {p.lifestyle.smoker ? "Smoker" : "Non-smoker"}, alcohol {p.lifestyle.alcohol}, exercise {p.lifestyle.exerciseDaysPerWeek} days a week
            </Item>
          )}
          {p?.emergencyContact && (
            <Item label="Emergency contact">
              {p.emergencyContact.name}
              {p.emergencyContact.relation ? ` (${p.emergencyContact.relation})` : ""}, {p.emergencyContact.phone}
            </Item>
          )}
        </dl>
      </Block>

      <Block title="Medicines" note={adherence.data?.percent != null ? `${adherence.data.percent}% of due doses marked taken in the last 30 days` : undefined}>
        {!meds.data?.length ? (
          <p className="text-ink-muted">None recorded.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-sm text-ink-faint">
              <tr>
                <th className="pb-2 font-[460]">Medicine</th>
                <th className="pb-2 font-[460]">Dose</th>
                <th className="pb-2 font-[460]">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-y border-line">
              {meds.data.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pr-3 font-[540]">{m.name}</td>
                  <td className="py-2.5 pr-3">{m.dose}</td>
                  <td className="figures py-2.5 text-ink-muted">
                    {m.schedule.times.join(", ")}
                    {m.instructions ? `, ${m.instructions}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Block>

      <Block title="Latest readings">
        <table className="w-full text-left">
          <tbody className="divide-y divide-line border-y border-line">
            {ROWS.map((type) => {
              const v = l[type];
              return (
                <tr key={type}>
                  <th scope="row" className="py-2.5 pr-3 font-[460] text-ink-muted">
                    {VITAL_LABELS[type]}
                  </th>
                  <td className="figures py-2.5 pr-3 font-[540]">{v ? formatReading(v) : "—"}</td>
                  <td className="py-2.5 pr-3">{v && <StatusBadge value={v.classification} />}</td>
                  <td className="py-2.5 text-right text-sm text-ink-faint">{v ? fmtDate(v.measuredAt) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Block>

      {bpStats && (
        <Block
          title="Blood pressure, last 30 days"
          note={
            bpStats.count === 1
              ? `1 reading: ${bpStats.avg[0]}/${bpStats.avg[1]} mmHg.`
              : `${bpStats.count} readings. Average ${bpStats.avg[0]}/${bpStats.avg[1]}, highest ${bpStats.max[0]}/${bpStats.max[1]}, lowest ${bpStats.min[0]}/${bpStats.min[1]} mmHg.`
          }
        >
          {bpStats.count > 1 && <TrendChart points={bpStats.points} unit="mmHg" dual height={200} />}
        </Block>
      )}
      {hrStats && (
        <Block
          title="Heart rate, last 30 days"
          note={hrStats.count === 1 ? `1 reading: ${hrStats.avg[0]} bpm.` : `${hrStats.count} readings. Average ${hrStats.avg[0]}, highest ${hrStats.max[0]}, lowest ${hrStats.min[0]} bpm.`}
        >
          {hrStats.count > 1 && <TrendChart points={hrStats.points} unit="bpm" height={180} />}
        </Block>
      )}

      <Block title="Symptoms, last 30 days">
        {!recentSymptoms.length ? (
          <p className="text-ink-muted">None logged.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {recentSymptoms.map((s) => (
              <li key={s.id} className="flex justify-between gap-4 py-2.5">
                <span>
                  <span className="font-[540] first-letter:uppercase">{s.type}</span>, severity <span className="figures">{s.severity}/10</span>
                  {s.accompaniedBy.length > 0 && <span className="text-ink-muted">, with {s.accompaniedBy.join(", ")}</span>}
                </span>
                <span className="shrink-0 text-sm text-ink-faint">{fmtDate(s.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Questions to ask">
        {questions.length > 0 && (
          <ol className="list-decimal space-y-2 pl-5 marker:text-ink-faint">
            {questions.map((q, i) => (
              <li key={i} className="group">
                {q}{" "}
                <button className="ml-1 text-sm text-ink-faint hover:text-danger print:hidden" onClick={() => setQuestions((all) => all.filter((_, j) => j !== i))} aria-label={`Remove question: ${q}`}>
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}
        {!questions.length && <p className="text-ink-muted print:hidden">Add what you want to ask, or let the assistant suggest questions from your record.</p>}
        <form
          className="mt-4 flex gap-2 print:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) setQuestions((q) => [...q, draft.trim()]);
            setDraft("");
          }}
        >
          <input className={inputClass} value={draft} maxLength={300} onChange={(e) => setDraft(e.target.value)} placeholder="Type a question" aria-label="New question" />
          <Button type="submit" variant="secondary" disabled={!draft.trim()}>
            Add
          </Button>
        </form>
        {ai.data?.available && (
          <div className="mt-3 flex flex-wrap items-center gap-3 print:hidden">
            <Button variant="ghost" size="sm" onClick={suggest} disabled={suggesting === "Thinking…"}>
              Suggest questions from my record
            </Button>
            {suggesting && <span className="text-sm text-ink-muted">{suggesting}</span>}
          </div>
        )}
      </Block>

      <footer className="border-t border-line pt-4 text-xs text-ink-faint">
        Prepared by the patient with Healthcare.AI from readings they recorded at home. Classifications use general published ranges and are not a diagnosis.
      </footer>
    </article>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-xl">{title}</h2>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-faint">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
