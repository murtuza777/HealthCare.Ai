import type { ReactNode } from "react";
import { Link } from "react-router";
import { CONSENT_VERSIONS } from "../../shared/account";
import { Wordmark } from "../components/Shell";

// Plain-language privacy policy and terms. Written to describe exactly what this code does.
// They must be reviewed by a qualified person before a public launch (see docs/TECH_PLAN.md).

function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ground">
      <header className="mx-auto flex h-20 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <nav className="flex gap-4 text-sm text-ink-muted">
          <Link to="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8">
        <h1 className="text-4xl font-light">{title}</h1>
        <p className="mt-3 text-sm text-ink-faint">Last updated {updated}. Draft for review before public launch.</p>
        <div className="legal mt-10 space-y-8 leading-relaxed text-ink [&_h2]:mb-3 [&_h2]:text-2xl [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-ink-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-muted">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy" updated={CONSENT_VERSIONS.privacy}>
      <section>
        <h2>In short</h2>
        <p>Your health record is yours. Only you, and people you invite, can see it. We don't sell it, show ads, or share it for marketing. You can download all of it or delete your account at any time.</p>
      </section>
      <section>
        <h2>What we store</h2>
        <ul>
          <li>Your account: name, email address, and a protected form of your password (it is scrambled on your device before it is sent, so we never see it).</li>
          <li>Your health profile: date of birth, sex, height, country, time zone, conditions, allergies, family history, lifestyle and emergency contact, as you enter them.</li>
          <li>What you log: readings, medicines and doses, symptoms, uploaded reports and files, and assistant conversations.</li>
          <li>Who you share with: caretakers, share links and their expiry, and a log of when caretakers or share links viewed your record.</li>
          <li>Technical data needed to run the service safely: sessions, rate limits, and a one-way scrambled form of IP addresses for share-link logs.</li>
        </ul>
      </section>
      <section>
        <h2>Where it is kept</h2>
        <p>The app runs on Cloudflare. Your data is stored in Cloudflare D1 (database) and R2 (files), and is encrypted in transit and at rest by Cloudflare. Report files are never public: each download is checked against your account or a valid share link.</p>
      </section>
      <section>
        <h2>The assistant</h2>
        <p>When you ask the assistant a question, a short summary of your record (profile, latest readings and trends, medicines, recent symptoms) and your question are sent to an AI model run by Cloudflare Workers AI to write the answer. This only happens after you agree to it. Emergency warnings never depend on AI: they come from fixed rules that run before any model is used.</p>
      </section>
      <section>
        <h2>Messages we send</h2>
        <p>Emails for verifying your address, resetting your password and caretaker invites and alerts. Notifications on your devices for medicine reminders, only if you turn them on.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Download everything we hold about you from Profile, Account.</li>
          <li>Delete your account from Profile, Account. This removes your record, files, caretaker links and conversations immediately.</li>
          <li>Remove a caretaker or revoke a share link at any time; access ends straight away.</li>
        </ul>
      </section>
      <section>
        <h2>Not a medical service</h2>
        <p>Healthcare.AI helps you keep and understand your own record. It does not diagnose or treat, and it is not monitored by clinicians. In an emergency, call your local emergency number.</p>
      </section>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms" updated={CONSENT_VERSIONS.terms}>
      <section>
        <h2>What this is</h2>
        <p>Healthcare.AI is a personal health record with reminders, sharing and an assistant. It supports your care; it does not replace your doctor, pharmacist or emergency services.</p>
      </section>
      <section>
        <h2>Medical information</h2>
        <ul>
          <li>Classifications of readings use general published ranges and may not fit your situation. Follow your clinician's advice.</li>
          <li>The assistant can be wrong. Never start, stop or change a medicine because of it.</li>
          <li>Reminders depend on your device, browser and network. Don't rely on them alone for critical medicines.</li>
          <li>If you think you are having an emergency, call your local emergency number now.</li>
        </ul>
      </section>
      <section>
        <h2>Your account</h2>
        <ul>
          <li>Keep your password private. You are responsible for who you invite and what you share.</li>
          <li>Only invite caretakers you trust; they will see what you choose until you remove them.</li>
          <li>Don't upload anything you don't have the right to share, or use the service to harm others.</li>
        </ul>
      </section>
      <section>
        <h2>Availability</h2>
        <p>We work to keep the service running and your data safe, but it is provided as is, without guarantees of availability. Download your data if you need a copy outside the app.</p>
      </section>
      <section>
        <h2>Ending</h2>
        <p>You can delete your account at any time. We may suspend accounts that abuse the service.</p>
      </section>
    </LegalPage>
  );
}
