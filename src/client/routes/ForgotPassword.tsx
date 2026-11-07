import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { passwordProblems } from "../../shared/auth";
import { authClient } from "../lib/auth-client";
import { breachCount, derivePasswordKey } from "../lib/password";
import { AuthLayout, authErrorMessage, PasswordInput, useAuthConfig } from "../lib/auth-ui";
import { Turnstile } from "../components/Turnstile";
import { buttonClass, inputClass } from "../components/Shell";

// Two steps: request a code by email, then enter it with a new password.
export function ForgotPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const config = useAuthConfig();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: FormEvent) {
    e.preventDefault();
    if (config.data?.turnstileSiteKey && !captcha) return setError("Please complete the security check.");
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.requestPasswordReset(
      { email: email.trim() },
      { headers: captcha ? { "x-captcha-response": captcha } : {} },
    );
    setBusy(false);
    setCaptchaReset((n) => n + 1);
    if (error) return setError(authErrorMessage(error));
    setStep("reset");
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problems = passwordProblems(password, email);
    if (problems.length) return setError(problems[0]!);
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const seen = await breachCount(password);
    if (seen && seen > 0) {
      setBusy(false);
      return setError(`This password has appeared in ${seen.toLocaleString()} data breaches. Please choose a different one.`);
    }
    const key = await derivePasswordKey(email, password);
    const { error } = await authClient.emailOtp.resetPassword({ email: email.trim(), otp, password: key });
    setBusy(false);
    if (error) return setError(authErrorMessage(error));
    navigate("/login?reset=1", { replace: true });
  }

  return (
    <AuthLayout
      title={step === "request" ? "Reset your password" : "Choose a new password"}
      subtitle={
        step === "request"
          ? "Enter your email and we'll send you a 6-digit code."
          : `If an account exists for ${email}, we emailed a code. It expires in 10 minutes. You'll be signed out on other devices.`
      }
      footer={
        <Link to="/login" className="font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
          Back to sign in
        </Link>
      }
    >
      {step === "request" ? (
        <form onSubmit={request} className="space-y-4">
          <label className="block text-sm font-[540] text-ink">
            Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${inputClass}`} />
          </label>
          <Turnstile siteKey={config.data?.turnstileSiteKey ?? null} onToken={setCaptcha} resetKey={captchaReset} />
          <button type="submit" disabled={busy} className={`w-full ${buttonClass}`}>
            {busy ? "Sending…" : "Send code"}
          </button>
          {error && (
            <p role="alert" className="text-sm font-[540] text-danger">
              {error}
            </p>
          )}
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
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
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" label="New password" />
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" label="Confirm new password" />
          <button type="submit" disabled={busy || otp.length !== 6} className={`w-full ${buttonClass}`}>
            {busy ? "Saving…" : "Set new password"}
          </button>
          {error && (
            <p role="alert" className="text-sm font-[540] text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
