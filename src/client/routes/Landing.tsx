import { Link } from "react-router";
import { Clock, FileText, Link2, Pill, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { HeartMark } from "../components/Shell";
import { ButtonLink, StatusBadge } from "../components/ui";
import { SampleTrace } from "../components/SampleTrace";

// Persuade surface. Direction: clinic chart (docs/design/brief.md). The hero proves the product
// with a chart sheet instead of claiming it; all figures on this page are labelled sample data.

const SAMPLE = (() => {
  // 30 mornings of plausible readings drifting down after a medication change. Deterministic.
  const out: { measuredAt: string; value: number; value2: number }[] = [];
  const start = Date.UTC(2026, 9, 8, 7, 30);
  for (let i = 0; i < 30; i++) {
    const wobble = Math.round(Math.sin(i * 1.7) * 4 + Math.cos(i * 0.9) * 3);
    const trend = Math.round(150 - i * 0.45);
    out.push({ measuredAt: new Date(start + i * 86400000).toISOString(), value: trend + wobble, value2: Math.round(92 - i * 0.2 + wobble / 2) });
  }
  return out;
})();
const latest = SAMPLE[SAMPLE.length - 1]!;
const SAMPLE_LABELS = [0, 10, 20, 29].map((i) => new Date(SAMPLE[i]!.measuredAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

export function Landing() {
  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <HeartMark />
            Healthcare.AI
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to="/login" className="rounded-control px-3 py-2 font-semibold text-ink hover:bg-well">
              Sign in
            </Link>
            <ButtonLink to="/signup" size="sm" className="hidden sm:inline-flex">
              Create account
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-20">
          <div>
            <h1 className="text-[2.375rem] leading-[1.08] tracking-[-0.025em] sm:text-5xl">Your heart readings, kept the way your cardiologist would keep them.</h1>
            <p className="mt-6 max-w-prose text-lg text-ink-muted">
              Log blood pressure, pulse and medicines in seconds. See straight away when a reading needs attention, and share your
              reports with your doctor through a link that expires.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/signup">Create a free account</ButtonLink>
              <ButtonLink to="/login" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
              <ShieldCheck className="h-4 w-4 shrink-0 text-status-normal" aria-hidden="true" />
              Only you, and the people you choose, can see your records.
            </p>
          </div>

          <div className="rounded-sheet border border-line bg-sheet p-5 shadow-lift sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-ink-muted">Blood pressure, last 30 days</h2>
                <p className="figures mt-1 text-4xl font-bold">
                  {latest.value}/{latest.value2}
                  <span className="ml-2 text-lg font-semibold text-ink-muted">mmHg</span>
                </p>
              </div>
              <div className="text-right">
                <StatusBadge value="high" />
                <p className="mt-1.5 text-sm text-ink-muted">This morning, 7:30</p>
              </div>
            </div>
            <div className="mt-5">
              <SampleTrace points={SAMPLE} labels={SAMPLE_LABELS} drawIn />
            </div>
            <p className="mt-3 text-xs text-ink-faint">Sample data for illustration.</p>
          </div>
        </section>

        <section className="border-t border-line bg-sheet">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl text-2xl sm:text-3xl">What you can do today</h2>
            <div className="mt-10 divide-y divide-line border-y border-line">
              <Feature
                title="Every reading, checked against clinical ranges"
                body="Blood pressure, pulse, oxygen, glucose, temperature, cholesterol and weight. Each reading is classified the moment you enter it, and charted over time."
              >
                <ul className="divide-y divide-line rounded-control border border-line">
                  <Reading name="Blood pressure" value="118/76 mmHg" status="normal" />
                  <Reading name="Pulse" value="104 bpm" status="high" />
                  <Reading name="Oxygen" value="93 %" status="borderline" />
                </ul>
              </Feature>
              <Feature title="Medicines on a clear schedule" body="Keep every medicine, dose and time in one list your family and doctor can trust. Reminders are coming next.">
                <ul className="divide-y divide-line rounded-control border border-line">
                  <Medicine name="Aspirin" dose="75 mg" times="08:00" />
                  <Medicine name="Atorvastatin" dose="20 mg" times="21:00" />
                  <Medicine name="Metoprolol" dose="25 mg" times="08:00, 20:00" />
                </ul>
              </Feature>
              <Feature title="Reports ready when your doctor asks" body="Upload lab results and scans, then share chosen reports with a QR code. The link stops working when it expires or when you revoke it.">
                <div className="flex items-center gap-4 rounded-control border border-line p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-action-soft text-action">
                    <Link2 className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">Lipid profile, ECG report</p>
                    <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Link works for 24 hours, opened twice
                    </p>
                  </div>
                </div>
              </Feature>
              <Feature title="Warnings that never wait for AI" body="Emergency readings and symptom combinations are caught by fixed medical rules, so the warning appears even if everything else is offline.">
                <div role="presentation" className="rounded-control bg-danger p-4 text-white">
                  <p className="flex items-center gap-2 font-semibold">
                    <TriangleAlert className="h-5 w-5" aria-hidden="true" /> These symptoms can be an emergency.
                  </p>
                  <p className="mt-1 text-sm text-white/90">Chest pain with shortness of breath can be a heart attack. Call 112 now.</p>
                </div>
              </Feature>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl">Being built next</h2>
              <p className="mt-3 max-w-prose text-ink-muted">These aren't available yet. They'll arrive in this order.</p>
            </div>
            <ol className="space-y-5">
              <Next icon={<FileText className="h-5 w-5" />} title="An assistant that reads your record">
                Questions answered from your own readings, medicines and reports, with clear advice on when to see a doctor.
              </Next>
              <Next icon={<Pill className="h-5 w-5" />} title="Medicine reminders">
                A nudge at each dose, and a note to your family if one is missed.
              </Next>
              <Next icon={<ShieldCheck className="h-5 w-5" />} title="Caretaker accounts">
                Let a family member see exactly what you choose, and be alerted when a reading needs attention.
              </Next>
            </ol>
          </div>
        </section>

        <section className="border-t border-line bg-sheet">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
            <p className="max-w-xl text-xl font-semibold">Start your record with today's reading.</p>
            <ButtonLink to="/signup">Create a free account</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-muted sm:px-6">
          Healthcare.AI supports your care but doesn't replace your doctor. In an emergency, call your local emergency number.
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 py-8 md:grid-cols-[1fr_1fr] md:gap-12">
      <div>
        <h3 className="text-xl">{title}</h3>
        <p className="mt-2 max-w-prose text-ink-muted">{body}</p>
      </div>
      <div className="self-center">{children}</div>
    </div>
  );
}

function Reading({ name, value, status }: { name: string; value: string; status: "normal" | "high" | "borderline" }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-ink-muted">{name}</span>
      <span className="flex items-center gap-3">
        <span className="figures font-semibold">{value}</span>
        <StatusBadge value={status} />
      </span>
    </li>
  );
}

function Medicine({ name, dose, times }: { name: string; dose: string; times: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <span>
        <span className="font-semibold">{name}</span> <span className="text-ink-muted">{dose}</span>
      </span>
      <span className="figures text-ink-muted">{times}</span>
    </li>
  );
}

function Next({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-control border border-line bg-sheet text-ink-muted" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-ink-muted">{children}</p>
      </div>
    </li>
  );
}
