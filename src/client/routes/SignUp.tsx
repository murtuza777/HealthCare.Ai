import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Check, X } from "lucide-react";
import { passwordProblems } from "../../shared/auth";
import { authClient, useSession } from "../lib/auth-client";
import { breachCount, derivePasswordKey } from "../lib/password";
import { AuthLayout, authErrorMessage, Divider, GoogleButton, PasswordInput, safeNext, useAuthConfig } from "../lib/auth-ui";
import { Turnstile } from "../components/Turnstile";
import { buttonClass, inputClass } from "../components/Shell";

export function SignUp() {
  const { data: session, isPending } = useSession();
  const config = useAuthConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<false | "checking" | "securing" | "creating">(false);

  if (!isPending && session) return <Navigate to={next} replace />;
  const problems = password ? passwordProblems(password, email) : [];
  const needsCaptcha = Boolean(config.data?.turnstileSiteKey);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (problems.length) return setError(problems[0]!);
    if (password !== confirm) return setError("The passwords don't match.");
    if (needsCaptcha && !captcha) return setError("Please complete the security check.");

    setBusy("checking");
    const seen = await breachCount(password);
    if (seen && seen > 0) {
      setBusy(false);
      return setError(`This password has appeared in ${seen.toLocaleString()} data breaches. Please choose a different one.`);
    }
    setBusy("securing");
    const key = await derivePasswordKey(email, password);
    setBusy("creating");
    const { error } = await authClient.signUp.email(
      { name: name.trim(), email: email.trim(), password: key },
      { headers: captcha ? { "x-captcha-response": captcha } : {} },
    );
    setBusy(false);
    if (error) {
      setCaptchaReset((n) => n + 1);
      return setError(authErrorMessage(error));
    }
    if (config.data?.emailVerification) {
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`, { replace: true });
    } else {
      navigate(next, { replace: true }); // signed in straight away until email is set up
    }
  }

  const rule = (ok: boolean, text: string) => (
    <li key={text} className={`flex items-center gap-1.5 ${ok ? "text-status-normal" : "text-ink-muted"}`}>
      {ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />} {text}
    </li>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your health records stay private: only you, and people you invite, can see them."
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
            Sign in
          </Link>
        </>
      }
    >
      {config.data?.google && (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-[540] text-ink">
          Full name
          <input required autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={`mt-1.5 ${inputClass}`} />
        </label>
        <label className="block text-sm font-[540] text-ink">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${inputClass}`} />
        </label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        {password && (
          <ul className="space-y-0.5 text-xs" aria-live="polite">
            {rule(password.length >= 10, "At least 10 characters")}
            {problems.filter((p) => !p.startsWith("Use at least")).map((p) => rule(false, p))}
          </ul>
        )}
        <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" label="Confirm password" />
        <Turnstile siteKey={config.data?.turnstileSiteKey ?? null} onToken={setCaptcha} resetKey={captchaReset} />
        <button type="submit" disabled={Boolean(busy)} className={`w-full ${buttonClass}`}>
          {busy === "checking" ? "Checking password…" : busy === "securing" ? "Securing…" : busy === "creating" ? "Creating account…" : "Create account"}
        </button>
        {error && (
          <p role="alert" className="text-sm font-[540] text-danger">
            {error}
          </p>
        )}
        <p className="text-sm text-ink-faint">
          Your password is protected on this device before it's sent, and checked against known data breaches without
          revealing it.
        </p>
        <p className="text-sm text-ink-faint">
          By creating an account you agree to the{" "}
          <Link to="/terms" className="underline underline-offset-4 hover:text-ink">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-ink">
            Privacy notice
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
