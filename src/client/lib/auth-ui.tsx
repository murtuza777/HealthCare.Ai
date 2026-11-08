// Shared pieces for the sign-in, sign-up, verify and reset screens.
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Wordmark } from "../components/Shell";
import { inputClass } from "../components/ui";

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
  if (/origin/i.test(error.message ?? "")) return "This page can't sign you in from this address. Open the app from its usual link and try again.";
  if (error.status === 503) return "Email isn't set up yet, so codes can't be sent. Try again later.";
  if (code.includes("CAPTCHA") || /captcha/i.test(error.message ?? "")) return "Complete the security check, then try again.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password don't match. Check both, or reset your password.";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "An account with this email already exists. Sign in instead.";
  if (code === "INVALID_OTP" || code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS") return "That code didn't work or has expired. Request a new one.";
  return error.message || "Something went wrong. Try again.";
}

/** One quiet column: the form, and a single line on how the password is protected. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <header className="mx-auto flex h-20 w-full max-w-5xl items-center px-5 sm:px-8">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center px-5 pb-16 pt-6">
        <h1 className="text-[2.25rem] font-light leading-[1.1] tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-3 text-ink-muted">{subtitle}</p>}
        <div className="mt-9">{children}</div>
        {footer && <div className="mt-9 border-t border-line pt-6 text-ink-muted">{footer}</div>}
      </main>
      <p className="mx-auto max-w-[25rem] px-5 pb-8 text-center text-xs text-ink-faint">
        Your password is scrambled on this device before it's sent. We never see it.
      </p>
    </div>
  );
}

export function PasswordInput({ value, onChange, autoComplete, label = "Password", id }: { value: string; onChange: (v: string) => void; autoComplete: string; label?: string; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-[540] text-ink">{label}</span>
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
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ink-faint transition-colors hover:bg-well hover:text-ink"
        >
          {show ? <EyeOff className="h-[1.125rem] w-[1.125rem]" /> : <Eye className="h-[1.125rem] w-[1.125rem]" />}
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
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-sheet px-4 text-[0.9375rem] font-[560] text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-well/60 active:scale-[0.97] disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem]" aria-hidden="true">
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
    <div className="my-6 flex items-center gap-4 text-xs text-ink-faint">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}
