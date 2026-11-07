// Shared pieces for the sign-in, sign-up, verify and reset screens.
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { HeartMark } from "../components/Shell";
import { inputClass } from "../components/ui";
import { Link } from "react-router";

export type AuthConfig = { google: boolean; emailVerification: boolean; turnstileSiteKey: string | null };

export function useAuthConfig() {
  return useQuery({
    queryKey: ["auth-config"],
    staleTime: Infinity,
    queryFn: async (): Promise<AuthConfig> => {
      const res = await fetch("/api/auth-config");
      if (!res.ok) throw new Error("Couldn't load sign-in options.");
      return res.json();
    },
  });
}

/** Only allow in-app redirects (prevents open redirects via ?next=). */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

/** Plain message for a Better Auth client error: what went wrong and what to do. */
export function authErrorMessage(error: { status?: number; code?: string; message?: string } | null | undefined): string {
  if (!error) return "";
  const code = error.code ?? "";
  if (error.status === 429) return "Too many attempts. Wait a few minutes, then try again.";
  if (error.status === 503) return "Email isn't set up yet, so codes can't be sent. Try again later.";
  if (code.includes("CAPTCHA") || /captcha/i.test(error.message ?? "")) return "Complete the security check, then try again.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password don't match. Check both, or reset your password.";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "An account with this email already exists. Sign in instead.";
  if (code === "INVALID_OTP" || code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS") return "That code didn't work or has expired. Request a new one.";
  return error.message || "Something went wrong. Try again.";
}

/** Two-column on wide screens: the form on a sheet, and a quiet reassurance panel. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen bg-ground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main className="flex min-h-screen flex-col px-4 py-8 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-2 self-start text-lg font-bold tracking-tight text-ink">
          <HeartMark />
          Healthcare.AI
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-ink-muted">{footer}</div>}
        </div>
      </main>
      <aside className="hidden border-l border-line bg-sheet lg:flex lg:flex-col lg:justify-center lg:px-14" aria-hidden="true">
        <div className="ecg-grid relative h-56 overflow-hidden rounded-sheet border border-grid-major/60">
          <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path
              d="M0 90 H70 l10 -6 l8 6 H120 l6 10 l10 -70 l10 92 l8 -32 H210 l12 -10 l12 10 H280 l6 10 l10 -70 l10 92 l8 -32 H400"
              fill="none"
              stroke="#14305A"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="mt-8 max-w-sm text-xl font-semibold text-ink">A careful record of your heart, for you and the people you trust.</p>
        <p className="mt-3 flex max-w-sm items-start gap-2 text-ink-muted">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-status-normal" />
          Your password is protected on this device before it's sent. We never see it.
        </p>
      </aside>
    </div>
  );
}

export function PasswordInput({ value, onChange, autoComplete, label = "Password", id }: { value: string; onChange: (v: string) => void; autoComplete: string; label?: string; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-control text-ink-muted hover:bg-well hover:text-ink"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { authClient } = await import("./auth-client");
        await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/login?error=google" });
        setBusy(false);
      }}
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-control border border-line-strong bg-sheet px-4 font-semibold text-ink transition-colors hover:bg-well disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
      </svg>
      {busy ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-ink-faint">
      <span className="h-px flex-1 bg-line" /> or use your email <span className="h-px flex-1 bg-line" />
    </div>
  );
}
