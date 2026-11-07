import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../lib/auth-client";
import { AuthLayout, authErrorMessage, safeNext } from "../lib/auth-ui";
import { buttonClass, inputClass } from "../components/Shell";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp });
    setBusy(false);
    if (error) return setError(authErrorMessage(error));
    await queryClient.invalidateQueries();
    navigate(next, { replace: true }); // verification signs you in
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "email-verification" });
    if (error) return setError(authErrorMessage(error));
    setNotice("If an account exists for this email, a new code is on its way.");
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We emailed you a 6-digit code. It expires in 10 minutes."
      footer={
        <Link to="/login" className="font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={verify} className="space-y-4">
        <label className="block text-sm font-[540] text-ink">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${inputClass}`} />
        </label>
        <label className="block text-sm font-[540] text-ink">
          Code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className={`mt-1.5 text-center text-xl tracking-[0.5em] ${inputClass}`}
          />
        </label>
        <button type="submit" disabled={busy || otp.length !== 6} className={`w-full ${buttonClass}`}>
          {busy ? "Verifying…" : "Verify and continue"}
        </button>
        <button type="button" onClick={resend} disabled={!email} className="w-full text-sm font-[540] text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink disabled:opacity-50">
          Send a new code
        </button>
        {notice && <p className="text-sm text-status-normal">{notice}</p>}
        {error && (
          <p role="alert" className="text-sm font-[540] text-danger">
            {error}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
