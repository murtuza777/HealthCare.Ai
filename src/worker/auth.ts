import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

/**
 * Can we actually deliver sign-in codes? Production needs RESEND_API_KEY.
 * EMAIL_MODE=outbox (local dev and tests) keeps codes in the outbox table instead.
 */
export const emailSignInAvailable = (env: Env) => Boolean(env.RESEND_API_KEY) || env.EMAIL_MODE === "outbox";
import { getDb } from "./db/client";
import * as schema from "./db/schema";
import { deliver, enqueue } from "./jobs/outbox";

// Passwordless auth: a 6-digit email code, plus Google when configured.
// Password hashing doesn't fit the free plan's 10 ms CPU limit (docs/TECH_PLAN.md §13).

function createAuth(env: Env) {
  const db = getDb(env);
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : undefined;

  return betterAuth({
    appName: "Healthcare.AI",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    trustedOrigins: [env.APP_URL],
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    telemetry: { enabled: false },
    // Cloudflare puts the client IP here; rate limits are keyed on it.
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    emailAndPassword: { enabled: false },
    socialProviders: google,
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh once a day
      // Signed cookie with the session for 5 minutes: most API calls skip the D1 session lookup.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      enabled: true,
      storage: "database", // in-memory limits are per-isolate on Workers
      window: 60,
      max: 100,
      customRules: {
        "/email-otp/send-verification-otp": { window: 300, max: 5 },
        "/sign-in/email-otp": { window: 300, max: 10 },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          // Runs as a background task (Better Auth hides timing to prevent account enumeration),
          // so "email not configured" is rejected earlier, in the API router (see emailSignInAvailable).
          const row = await enqueue(db, { channel: "email", recipient: email, kind: `otp:${type}`, payload: { otp } });
          await deliver(env, db, row); // try now; the cron retries on failure
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionData = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

// One instance per isolate: building Better Auth on every request wastes CPU.
const cache = new WeakMap<Env, Auth>();
export function getAuth(env: Env): Auth {
  let auth = cache.get(env);
  if (!auth) {
    auth = createAuth(env);
    cache.set(env, auth);
  }
  return auth;
}
