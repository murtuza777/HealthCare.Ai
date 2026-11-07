import { Link } from "react-router";
import type { ReactNode } from "react";
import { Wordmark } from "../components/Shell";
import { ButtonLink, StatusBadge } from "../components/ui";
import { SampleTrace } from "../components/SampleTrace";

// Persuade surface. Direction: quiet record (docs/design/brief.md). Type and one real chart carry
// the page; no boxes, no icon grids. All figures here are labelled sample data.

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
const first = SAMPLE[0]!;
const latest = SAMPLE[SAMPLE.length - 1]!;
const SAMPLE_LABELS = [0, 10, 20, 29].map((i) => new Date(SAMPLE[i]!.measuredAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

const wrap = "mx-auto w-full max-w-5xl px-5 sm:px-8";

export function Landing() {
  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className={`${wrap} flex h-20 items-center justify-between`}>
        <Wordmark />
        <nav className="flex items-center gap-1" aria-label="Account">
          <Link to="/login" className="whitespace-nowrap rounded-full px-3 py-2 text-[0.9375rem] font-[540] text-ink-muted transition-colors hover:text-ink sm:px-4">
            Sign in
          </Link>
          <ButtonLink to="/signup" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className={`${wrap} settle pb-16 pt-16 sm:pt-24`}>
          <h1 className="max-w-3xl text-[2.75rem] font-light leading-[1.05] tracking-[-0.03em] sm:text-[4.25rem]">
            A calm, careful record of your heart.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            Log blood pressure, pulse and medicines in a few seconds. Know at once when a reading needs attention, and share it with your
            doctor through a link that expires.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink to="/signup">Create a free account</ButtonLink>
            <ButtonLink to="/login" variant="ghost">
              I have an account
            </ButtonLink>
          </div>
        </section>

        <section className={`${wrap} pb-24`} aria-labelledby="sample-title">
          <div className="border-t border-line pt-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p id="sample-title" className="text-sm text-ink-muted">
                  Blood pressure, last 30 days
                </p>
                <p className="mt-2 flex items-baseline gap-3">
                  <span className="reading text-[3.5rem] leading-none sm:text-[4.5rem]">
                    {latest.value}/{latest.value2}
                  </span>
                  <span className="text-ink-muted">mmHg</span>
                </p>
              </div>
              <dl className="flex gap-10 text-sm">
                <div>
                  <dt className="text-ink-muted">Status</dt>
                  <dd className="mt-1.5">
                    <StatusBadge value="high" />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">A month ago</dt>
                  <dd className="figures mt-1.5 text-ink">
                    {first.value}/{first.value2}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-8">
              <SampleTrace points={SAMPLE} labels={SAMPLE_LABELS} drawIn />
            </div>
            <p className="mt-4 text-xs text-ink-faint">Sample data for illustration.</p>
          </div>
        </section>

        <section className={`${wrap} pb-24`}>
          <h2 className="max-w-2xl text-3xl sm:text-4xl">What it does today</h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-3">
            <Point title="Checks every reading">
              Blood pressure, pulse, oxygen, glucose, temperature, cholesterol and weight, each classified against clinical ranges the moment
              you enter it, then charted over time.
            </Point>
            <Point title="Keeps one medicine list">
              Every medicine, dose and time in a single list that you, your family and your doctor can trust.
            </Point>
            <Point title="Shares reports briefly">
              Upload lab results and scans, then share chosen reports by link or QR code. The link stops working when it expires or when you
              revoke it.
            </Point>
          </div>
        </section>

        <section className="border-y border-line bg-sheet">
          <div className={`${wrap} grid gap-8 py-20 md:grid-cols-[1fr_1.6fr] md:gap-16`}>
            <p className="text-sm text-ink-muted">Safety, by design</p>
            <p className="font-serif text-2xl font-light leading-snug tracking-[-0.015em] sm:text-[2rem] sm:leading-[1.25]">
              Emergency warnings come from fixed medical rules, never from AI. They appear the moment a reading or a set of symptoms needs it,
              even when everything else is offline.
            </p>
          </div>
        </section>

        <section className={`${wrap} py-24`}>
          <div className="grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16">
            <div>
              <h2 className="text-3xl">Coming next</h2>
              <p className="mt-3 text-ink-muted">Not available yet. They'll arrive in this order.</p>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              <Next n={1} title="An assistant that reads your record">
                Answers drawn from your own readings, medicines and reports, with clear advice on when to see a doctor.
              </Next>
              <Next n={2} title="Medicine reminders">
                A nudge at each dose, and a note to your family if one is missed.
              </Next>
              <Next n={3} title="Caretaker access">
                Let a family member see exactly what you choose, and hear when a reading needs attention.
              </Next>
            </ol>
          </div>
        </section>

        <section className={`${wrap} pb-24`}>
          <div className="flex flex-col items-start justify-between gap-6 border-t border-line pt-10 sm:flex-row sm:items-center">
            <p className="font-serif text-2xl font-light tracking-[-0.015em]">Start with today's reading.</p>
            <ButtonLink to="/signup">Create a free account</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${wrap} flex flex-col gap-2 py-8 text-sm text-ink-muted sm:flex-row sm:justify-between`}>
          <p>Healthcare.AI supports your care. It doesn't replace your doctor.</p>
          <p className="flex gap-4">
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <span>In an emergency, call your local emergency number.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Point({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-ink pt-5">
      <h3 className="text-base">{title}</h3>
      <p className="mt-2 text-ink-muted">{children}</p>
    </div>
  );
}

function Next({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-4 py-5">
      <span className="reading text-xl leading-7 text-ink-faint" aria-hidden="true">
        {n}
      </span>
      <div>
        <p className="font-[560]">{title}</p>
        <p className="mt-1 text-ink-muted">{children}</p>
      </div>
    </li>
  );
}
