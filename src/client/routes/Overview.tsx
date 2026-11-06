import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CheckCircle2, Droplet, HeartPulse, Pill, Scale, Stethoscope, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ageFrom, riskFactors, type RiskFactorStatus } from "../../shared/risk";
import type { VitalType } from "../../shared/vitals";
import { useLatestVitals, useMedications, useProfile, useSymptoms, useVitals } from "../lib/queries";
import { formatReading, timeAgo } from "../lib/format";
import { Button, Card, EmptyState, Loading, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";

// Ported from legacy/app/components/PatientOverview.tsx. Changes: no made-up default values
// (the old screen showed 75 bpm / 120/80 when there was no data); risk is a list of recognized
// factors instead of an invented point score.

const CARDS: { type: VitalType; title: string; icon: LucideIcon; accent: string }[] = [
  { type: "heart_rate", title: "Heart rate", icon: HeartPulse, accent: "text-red-400" },
  { type: "blood_pressure", title: "Blood pressure", icon: Activity, accent: "text-blue-400" },
  { type: "glucose", title: "Glucose", icon: Droplet, accent: "text-amber-400" },
  { type: "weight", title: "Weight", icon: Scale, accent: "text-emerald-400" },
];

export function Overview() {
  const profile = useProfile();
  const latest = useLatestVitals();
  const toast = useToastFromNavigation();

  if (profile.isPending || latest.isPending) return <Loading label="Loading your health data…" />;

  const p = profile.data;
  const l = latest.data ?? {};
  const age = ageFrom(p?.dateOfBirth);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-4 py-3 text-emerald-200"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {!p?.onboardedAt ? (
        <Card>
          <EmptyState
            icon={<UserPlus className="h-14 w-14" />}
            title="Welcome to your health profile"
            body="Add a few details about you and your heart history. It takes about two minutes and makes every reading and recommendation more useful."
            action={
              <Link to="/app/profile">
                <Button>Set up profile</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{p.name}</h1>
            <p className="text-gray-300">
              {[age !== null && `Age ${age}`, p.heightCm && `${p.heightCm} cm`, l.weight && `${l.weight.value} kg`].filter(Boolean).join(" · ") ||
                "Add your date of birth and height in your profile."}
            </p>
          </div>
          <Link to="/app/profile">
            <Button variant="secondary">Update details</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map(({ type, title, icon: Icon, accent }, i) => {
          const v = l[type];
          return (
            <Card key={type} delay={i * 0.05} className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white/10 p-2">
                  <Icon className={`h-6 w-6 ${accent}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-300">{title}</p>
                  {v ? (
                    <>
                      <p className="text-2xl font-semibold tabular-nums">{formatReading(v)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <StatusBadge value={v.classification} /> {timeAgo(v.measuredAt)}
                      </div>
                    </>
                  ) : (
                    <Link to="/app/vitals" className="mt-1 inline-block text-sm text-red-400 hover:text-red-300">
                      No reading yet. Log one
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendCard type="blood_pressure" title="Blood pressure trend" unit="mmHg" dual />
        <TrendCard type="heart_rate" title="Heart rate trend" unit="bpm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {isPending ? <Loading /> : <TrendChart points={data ?? []} unit={unit} dual={dual} />}
    </Card>
  );
}

const STATUS_STYLE: Record<RiskFactorStatus, { dot: string; text: string }> = {
  present: { dot: "bg-orange-400", text: "Present" },
  absent: { dot: "bg-emerald-400", text: "Not present" },
  unknown: { dot: "bg-gray-500", text: "Not recorded" },
};

function RiskCard({ profile, latest }: { profile: Parameters<typeof riskFactors>[0]; latest: Parameters<typeof riskFactors>[1] }) {
  const factors = riskFactors(profile, latest);
  const present = factors.filter((f) => f.status === "present").length;
  const unknown = factors.filter((f) => f.status === "unknown").length;
  return (
    <Card>
      <h2 className="text-lg font-semibold">Heart risk factors</h2>
      <p className="mt-1 text-sm text-gray-300">
        {present === 0 ? "No known risk factors recorded." : `${present} of ${factors.length} recognized risk factors present.`}
        {unknown > 0 && ` ${unknown} not recorded yet.`} This is a checklist, not a diagnosis. Discuss it with your doctor.
      </p>
      <ul className="mt-4 divide-y divide-white/10">
        {factors.map((f) => (
          <li key={f.id} className="flex items-start gap-3 py-2">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_STYLE[f.status].dot}`} aria-hidden="true" />
            <div>
              <p className="font-medium">
                {f.label} <span className="text-xs font-normal text-gray-400">· {STATUS_STYLE[f.status].text}</span>
              </p>
              <p className="text-sm text-gray-400">{f.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MedicationsCard() {
  const { data, isPending } = useMedications();
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Current medications</h2>
        <Link to="/app/medications" className="text-sm text-red-400 hover:text-red-300">
          Manage
        </Link>
      </div>
      {isPending ? (
        <Loading />
      ) : !data?.length ? (
        <p className="text-gray-400">No medications added.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 5).map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <Pill className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span className="font-medium">{m.name}</span>
              <span className="text-sm text-gray-400">
                {m.dose} · {m.schedule.times.join(", ")}
              </span>
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent symptoms</h2>
        <Link to="/app/symptoms" className="text-sm text-red-400 hover:text-red-300">
          Log symptom
        </Link>
      </div>
      {isPending ? (
        <Loading />
      ) : !data?.length ? (
        <p className="text-gray-400">No symptoms logged.</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 3).map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <Stethoscope className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span className="font-medium capitalize">{s.type}</span>
              <span className="text-sm text-gray-400">
                severity {s.severity}/10 · {timeAgo(s.occurredAt)}
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
  // Hide after a few seconds (separate effect, so clearing the state above doesn't cancel it).
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return toast;
}
