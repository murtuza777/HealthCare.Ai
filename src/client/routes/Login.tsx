import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { authClient, useSession } from "../lib/auth-client";
import { derivePasswordKey } from "../lib/password";
import { AuthLayout, authErrorMessage, Divider, GoogleButton, PasswordInput, safeNext, useAuthConfig } from "../lib/auth-ui";
import { Turnstile } from "../components/Turnstile";
import { buttonClass, inputClass } from "../components/Shell";

export function Login() {
  const { data: session, isPending } = useSession();
  const config = useAuthConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(params.get("error") === "google" ? "Google sign-in didn't complete. Please try again." : null);
  const [busy, setBusy] = useState<false | "securing" | "signing-in">(false);

  if (!isPending && session) return <Navigate to={next} replace />;
  const needsCaptcha = Boolean(config.data?.turnstileSiteKey);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (needsCaptcha && !captcha) return setError("Please complete the security check.");
    setError(null);
    setBusy("securing");
    const key = await derivePasswordKey(email, password);
    setBusy("signing-in");
    const { error } = await authClient.signIn.email(
      { email: email.trim(), password: key },
      { headers: captcha ? { "x-captcha-response": captcha } : {} },
    );
    setBusy(false);
    if (!error) return navigate(next, { replace: true });
    setCaptchaReset((n) => n + 1); // tokens are single-use
    if (error.status === 403) {
      // Email not verified yet: a fresh code is sent on sign-in attempts.
      return navigate(`/verify-email?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
    }
    setError(authErrorMessage(error));
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New to Healthcare.AI?{" "}
          <Link to={`/signup${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-action hover:underline">
            Create an account
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
        {params.get("reset") === "1" && <p className="text-sm font-semibold text-status-normal">Password updated. Sign in with your new password.</p>}
        <label className="block text-sm font-semibold text-ink">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${inputClass}`} />
        </label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="text-right text-sm">
          <Link to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="font-semibold text-action hover:underline">
            Forgot password?
          </Link>
        </div>
        <Turnstile siteKey={config.data?.turnstileSiteKey ?? null} onToken={setCaptcha} resetKey={captchaReset} />
        <button type="submit" disabled={Boolean(busy)} className={`w-full ${buttonClass}`}>
          {busy === "securing" ? "Securing…" : busy === "signing-in" ? "Signing in…" : "Sign in"}
        </button>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
