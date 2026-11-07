// Shared pieces for the sign-in, sign-up, verify and reset screens.
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router";
import { Card, Shell } from "../components/Shell";
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

/** Friendly message for a Better Auth client error. */
export function authErrorMessage(error: { status?: number; code?: string; message?: string } | null | undefined): string {
  if (!error) return "";
  const code = error.code ?? "";
  if (error.status === 429) return "Too many attempts. Wait a few minutes and try again.";
  if (error.status === 503) return "Email isn't set up yet, so codes can't be sent. Please try again later.";
  if (code.includes("CAPTCHA") || /captcha/i.test(error.message ?? "")) return "Please complete the security check and try again.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password don't match.";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "An account with this email already exists. Sign in instead.";
  if (code === "INVALID_OTP" || code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS") return "That code didn't work or has expired. Request a new one.";
  return error.message || "Something went wrong. Please try again.";
}

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Shell>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-6 text-center text-2xl font-bold">
          Healthcare<span className="text-red-500">.AI</span>
        </Link>
        <Card>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-300">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-gray-300">{footer}</div>}
      </main>
    </Shell>
  );
}

export function PasswordInput({ value, onChange, autoComplete, label = "Password" }: { value: string; onChange: (v: string) => void; autoComplete: string; label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm text-gray-300">
      {label}
      <span className="relative mt-1 block">
        <input
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white px-4 py-2 font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      {busy ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
      <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
