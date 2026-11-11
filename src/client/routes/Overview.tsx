import { useEffect, useState } from "react";
import { useSession } from "../lib/auth-client";
import { Link, useLocation, useNavigate } from "react-router";
import { ageFrom, riskFactors, type RiskFactorStatus } from "../../shared/risk";
import type { VitalType } from "../../shared/vitals";
import { useLatestVitals, useProfile, useSymptoms, useVitals } from "../lib/queries";
import { formatReading, timeAgo, VITAL_LABELS } from "../lib/format";
import { ButtonLink, Card, Loading, Notice, SheetHeader, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";
import { TodayDoses } from "../components/Doses";
import { usePatientsCaredFor } from "../lib/care";

// The overview answers one question first: "are my latest readings OK?" Readings are a chart
// table, not a grid of identical cards. No made-up defaults when data is missing.

const ROWS: VitalType[] = ["blood_pressure", "heart_rate", "spo2", "glucose", "weight"];

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Overview() {
  const profile = useProfile();
  const { data: session } = useSession();
  const latest = useLatestVitals();
  const toast = useToastFromNavigation();

  if (profile.isPending || latest.isPending) return <Loading label="Loading your record" lines={5} />;

  const p = profile.data;
  const l = latest.data ?? {};
  const age = ageFrom(p?.dateOfBirth);
  const first = (p?.name || session?.user.name)?.trim().split(/\s+/)[0];
  const facts = [age !== null && `Age ${age}`, p?.heightCm && `${p.heightCm} cm`, l.weight && `${l.weight.value} kg`].filter(Boolean) as string[];

  return (
    <div className="space-y-14">
      {toast && <Notice tone="success">{toast}</Notice>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light sm:text-[2.75rem] sm:leading-[1.1]">
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="mt-2 text-ink-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            {facts.length > 0 && <span className="ml-4 hidden text-ink-faint sm:inline">{facts.join(", ")}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/app/timeline" variant="ghost">
            History
          </ButtonLink>
          <ButtonLink to="/app/visit" variant="secondary">
            Prepare for a visit
          </ButtonLink>
        <ButtonLink to="/app/vitals">
          Log a reading
        </ButtonLink>
        </div>
      </div>

      <CaringStrip />

      {!p?.onboardedAt && (
        <Card boxed>
          <h2 className="text-xl">Finish setting up your profile</h2>
          <p className="mt-1 max-w-prose text-ink-muted">
            Your age, heart history and medicines make every reading's check more accurate. It takes about two minutes.
          </p>
          <ButtonLink to="/app/profile" size="sm" className="mt-5">
            Set up profile
          </ButtonLink>
        </Card>
      )}

      <section>
        <SheetHeader title="Latest readings" />
        <table className="w-full border-collapse text-left">
          <thead className="hidden text-sm text-ink-faint sm:table-header-group">
            <tr>
              <th scope="col" className="pb-2 pr-3 font-[460]">Measure</th>
              <th scope="col" className="px-3 pb-2 font-[460]">Reading</th>
              <th scope="col" className="px-3 pb-2 font-[460]">Status</th>
              <th scope="col" className="pb-2 pl-3 text-right font-[460]">Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-y border-line">
            {ROWS.map((type) => {
              const v = l[type];
              return (
                <tr key={type} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 py-4 sm:table-row sm:p-0">
                  <th scope="row" className="font-[460] text-ink-muted sm:py-5 sm:pr-3">
                    {VITAL_LABELS[type]}
                  </th>
                  {v ? (
                    <>
                      <td className="row-start-2 sm:px-3 sm:py-5">
                        <Reading text={formatReading(v)} />
                      </td>
                      <td className="text-right sm:px-3 sm:py-5 sm:text-left">
                        <StatusBadge value={v.classification} />
                      </td>
                      <td className="row-start-2 self-center text-right text-sm text-ink-faint sm:py-5 sm:pl-3">{timeAgo(v.measuredAt)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="text-right text-ink-faint sm:px-3 sm:py-5 sm:text-left">
                      <span className="mr-3">Not recorded yet</span>
                      <Link to="/app/vitals" className="font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
                        Log it
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <TodayDoses compact />

      <div className="grid gap-x-12 gap-y-14 lg:grid-cols-2">
        <TrendCard type="blood_pressure" title="Blood pressure trend" unit="mmHg" dual />
        <TrendCard type="heart_rate" title="Heart rate trend" unit="bpm" />
      </div>

      <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[1.15fr_1fr]">
        <RiskCard profile={p ?? null} latest={l} />
        <div className="space-y-14">
          <SymptomsCard />
        </div>
      </div>
    </div>
  );
}

/** "138/86 mmHg" set as a serif figure with a small sans unit. */
function Reading({ text }: { text: string }) {
  const at = text.lastIndexOf(" ");
  const value = at > 0 ? text.slice(0, at) : text;
  const unit = at > 0 ? text.slice(at + 1) : "";
  return (
    <span className="whitespace-nowrap">
      <span className="reading text-[1.75rem] leading-none">{value}</span>
      {unit && <span className="ml-1.5 text-sm text-ink-muted">{unit}</span>}
    </span>
  );
}

function TrendCard({ type, title, unit, dual }: { type: VitalType; title: string; unit: string; dual?: boolean }) {
  const { data, isPending } = useVitals(type, 30);
  return (
    <Card>
      <SheetHeader title={title} description="Last 30 readings" />
      {isPending ? <Loading /> : <TrendChart points={data ?? []} unit={unit} dual={dual} />}
    </Card>
  );
}

const RISK: Record<RiskFactorStatus, { dot: string; text: string }> = {
  present: { dot: "bg-status-high", text: "Present" },
  absent: { dot: "bg-status-normal", text: "Not present" },
  unknown: { dot: "border border-ink-faint", text: "Not recorded" },
};

function RiskCard({ profile, latest }: { profile: Parameters<typeof riskFactors>[0]; latest: Parameters<typeof riskFactors>[1] }) {
  const factors = riskFactors(profile, latest);
  const present = factors.filter((f) => f.status === "present").length;
  const unknown = factors.filter((f) => f.status === "unknown").length;
  return (
    <Card>
      <SheetHeader
        title="Heart risk factors"
        description={`${present} of ${factors.length} present${unknown ? `, ${unknown} not recorded` : ""}. A checklist to discuss with your doctor, not a diagnosis.`}
      />
      <ul className="divide-y divide-line border-y border-line">
        {factors.map((f) => {
          const r = RISK[f.status];
          return (
            <li key={f.id} className="py-3.5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-[540]">{f.label}</span>
                  <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${r.dot}`} />
                    {r.text}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{f.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function SymptomsCard() {
  const { data, isPending } = useSymptoms();
  return (
    <Card>
      <SheetHeader
        title="Recent symptoms"
        action={
          <Link to="/app/symptoms" className="font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
            Log a symptom
          </Link>
        }
      />
      {isPending ? (
        <Loading lines={2} />
      ) : !data?.length ? (
        <p className="text-ink-muted">Nothing logged. Note anything unusual, even if it passed.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {data.slice(0, 3).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3.5">
              <span className="font-[540] first-letter:uppercase">{s.type}</span>
              <span className="text-sm text-ink-muted">
                <span className="figures">{s.severity}/10</span>, {timeAgo(s.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Shows a message passed via navigate(..., { state: { toast } }) for a few seconds. */
function useToastFromNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = (location.state as { toast?: string } | null)?.toast ?? null;
  const [toast, setToast] = useState<string | null>(incoming);
  // The message is read once into state above; clear it from history so a refresh doesn't repeat it.
  useEffect(() => {
    if (!incoming) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [incoming, navigate, location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  return toast;
}

function CaringStrip() {
  const { data } = usePatientsCaredFor();
  if (!data?.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-well px-4 py-3 text-ink">
      <span className="text-ink-muted">You care for</span>
      {data.map((p) => (
        <Link key={p.patientId} to={`/app/care/${p.patientId}`} className="font-[540] underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {p.name}
        </Link>
      ))}
    </p>
  );
}
