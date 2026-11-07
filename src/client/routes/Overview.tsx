import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { CircleCheck, CircleDashed, CircleAlert, Pill, Plus, Stethoscope } from "lucide-react";
import { ageFrom, riskFactors, type RiskFactorStatus } from "../../shared/risk";
import type { VitalType } from "../../shared/vitals";
import { useLatestVitals, useMedications, useProfile, useSymptoms, useVitals } from "../lib/queries";
import { formatReading, timeAgo, VITAL_LABELS } from "../lib/format";
import { ButtonLink, Card, Loading, Notice, SheetHeader, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";

// The overview answers one question first: "are my latest readings OK?" Readings are a chart
// table, not a grid of identical cards. No made-up defaults when data is missing.

const ROWS: VitalType[] = ["blood_pressure", "heart_rate", "spo2", "glucose", "weight"];

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Overview() {
  const profile = useProfile();
  const latest = useLatestVitals();
  const toast = useToastFromNavigation();

  if (profile.isPending || latest.isPending) return <Loading label="Loading your record" lines={5} />;

  const p = profile.data;
  const l = latest.data ?? {};
  const age = ageFrom(p?.dateOfBirth);
  const first = p?.name?.split(" ")[0];
  const facts = [age !== null && `Age ${age}`, p?.heightCm && `${p.heightCm} cm`, l.weight && `${l.weight.value} kg`].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {toast && <Notice tone="success">{toast}</Notice>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="mt-1 text-ink-muted">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            {facts.length > 0 && <span className="ml-3 hidden sm:inline">{facts.join(", ")}</span>}
          </p>
        </div>
        <ButtonLink to="/app/vitals">
          <Plus className="h-5 w-5" aria-hidden="true" /> Log a reading
        </ButtonLink>
      </div>

      {!p?.onboardedAt && (
        <Card className="border-action/30 bg-action-soft shadow-none">
          <h2 className="text-lg">Finish setting up your profile</h2>
          <p className="mt-1 max-w-prose text-ink-muted">
            Your age, heart history and medicines make every reading's check more accurate. It takes about two minutes.
          </p>
          <ButtonLink to="/app/profile" className="mt-4">
            Set up profile
          </ButtonLink>
        </Card>
      )}

      <Card flush>
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <SheetHeader title="Latest readings" />
        </div>
        <table className="w-full border-collapse text-left">
          <thead className="hidden border-y border-line bg-well text-sm text-ink-muted sm:table-header-group">
            <tr>
              <th scope="col" className="px-6 py-2.5 font-semibold">Measure</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Reading</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-6 py-2.5 text-right font-semibold">Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-t border-line sm:border-t-0">
            {ROWS.map((type) => {
              const v = l[type];
              return (
                <tr key={type} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-4 sm:table-row sm:p-0">
                  <th scope="row" className="font-semibold text-ink sm:px-6 sm:py-4">
                    {VITAL_LABELS[type]}
                  </th>
                  {v ? (
                    <>
                      <td className="figures row-start-2 text-2xl font-bold sm:px-3 sm:py-4">{formatReading(v)}</td>
                      <td className="text-right sm:px-3 sm:py-4 sm:text-left">
                        <StatusBadge value={v.classification} />
                      </td>
                      <td className="row-start-2 self-center text-right text-sm text-ink-muted sm:px-6 sm:py-4">{timeAgo(v.measuredAt)}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="text-right text-ink-muted sm:px-3 sm:py-4 sm:text-left">
                      <span className="mr-3">Not recorded yet</span>
                      <Link to="/app/vitals" className="font-semibold text-action hover:underline">
                        Log it
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendCard type="blood_pressure" title="Blood pressure trend" unit="mmHg" dual />
        <TrendCard type="heart_rate" title="Heart rate trend" unit="bpm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <RiskCard profile={p ?? null} latest={l} />
        <div className="space-y-6">
          <MedicationsCard />
          <SymptomsCard />
        </div>
      </div>
    </div>
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

const RISK: Record<RiskFactorStatus, { icon: typeof CircleCheck; cls: string; text: string }> = {
  present: { icon: CircleAlert, cls: "text-status-high", text: "Present" },
  absent: { icon: CircleCheck, cls: "text-status-normal", text: "Not present" },
  unknown: { icon: CircleDashed, cls: "text-ink-faint", text: "Not recorded" },
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
      <ul className="divide-y divide-line border-t border-line">
        {factors.map((f) => {
          const r = RISK[f.status];
          const Icon = r.icon;
          return (
            <li key={f.id} className="flex items-start gap-3 py-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${r.cls}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{f.label}</span>
                  <span className={`text-sm font-semibold ${r.cls}`}>{r.text}</span>
                </p>
                <p className="text-sm text-ink-muted">{f.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function MedicationsCard() {
  const { data, isPending } = useMedications();
  return (
    <Card>
      <SheetHeader
        title="Medicines"
        action={
          <Link to="/app/medications" className="font-semibold text-action hover:underline">
            Manage
          </Link>
        }
      />
      {isPending ? (
        <Loading lines={2} />
      ) : !data?.length ? (
        <p className="text-ink-muted">
          No medicines added.{" "}
          <Link to="/app/medications" className="font-semibold text-action hover:underline">
            Add your first
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {data.slice(0, 5).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3">
                <Pill className="h-5 w-5 text-ink-faint" aria-hidden="true" />
                <span>
                  <span className="font-semibold">{m.name}</span> <span className="text-ink-muted">{m.dose}</span>
                </span>
              </span>
              <span className="figures text-ink-muted">{m.schedule.times.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
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
          <Link to="/app/symptoms" className="font-semibold text-action hover:underline">
            Log a symptom
          </Link>
        }
      />
      {isPending ? (
        <Loading lines={2} />
      ) : !data?.length ? (
        <p className="text-ink-muted">Nothing logged. Note anything unusual, even if it passed.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {data.slice(0, 3).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-ink-faint" aria-hidden="true" />
                <span className="font-semibold first-letter:uppercase">{s.type}</span>
              </span>
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
