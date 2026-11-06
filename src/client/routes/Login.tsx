import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { authClient, useSession } from "../lib/auth-client";
import { buttonClass, Card, inputClass, Shell } from "../components/Shell";

// Passwordless: email → 6-digit code → signed in. New emails get an account automatically.
export function Login() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && session) return <Navigate to={next} replace />;

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many attempts. Wait a few minutes."
          : error.status === 503
            ? "Email sign-in isn't available yet. Please try again later."
            : "Couldn't send the code. Check the email address.",
      );
      return;
    }
    setStep("code");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (error) {
      setError("That code didn't work. Check it, or request a new one.");
      return;
    }
    navigate(next, { replace: true });
  }

  return (
    <Shell>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Card>
          <h1 className="text-2xl font-semibold">Sign in to Healthcare.AI</h1>
          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <label className="block text-sm text-gray-300">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
              </label>
              <button type="submit" disabled={busy} className={`w-full ${buttonClass}`}>
                {busy ? "Sending…" : "Email me a sign-in code"}
              </button>
              <p className="text-xs text-gray-400">No password needed. New here? Signing in creates your account.</p>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-4">
              <p className="text-sm text-gray-300">
                We sent a 6-digit code to <span className="font-medium text-white">{email}</span>. It expires in 5
                minutes.
              </p>
              <label className="block text-sm text-gray-300">
                Code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className={`mt-1 text-center text-xl tracking-[0.5em] ${inputClass}`}
                />
              </label>
              <button type="submit" disabled={busy || otp.length !== 6} className={`w-full ${buttonClass}`}>
                {busy ? "Checking…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
                className="w-full text-sm text-gray-400 hover:text-white"
              >
                Use a different email
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </Card>
      </main>
    </Shell>
  );
}

/** Only allow in-app redirects (prevents open redirects via ?next=). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}
