import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha, emailOTP, jwt } from "better-auth/plugins";
import { getDb } from "./db/client";
import * as schema from "./db/schema";
import { deliver, enqueue } from "./jobs/outbox";
import { passwordHasher } from "./password";

// Email + password (stretched in the browser, see src/shared/auth.ts), email verification and
// password reset by 6-digit code, optional Google sign-in, optional Cloudflare Turnstile.
// Sessions: an httpOnly session cookie (revocable, stored in D1) plus a short-lived signed JWT
// cookie cache so most requests skip the database. The JWT plugin also issues 15-minute access
// tokens (EdDSA, JWKS at /api/auth/jwks) for clients that can't use cookies.

/** Can we deliver codes by email? Production needs RESEND_API_KEY; EMAIL_MODE=outbox is for dev and tests. */
export const emailAvailable = (env: Env) => Boolean(env.RESEND_API_KEY) || env.EMAIL_MODE === "outbox";

export const googleEnabled = (env: Env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const turnstileEnabled = (env: Env) => Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);

/** Endpoints protected by Turnstile (bots creating accounts, guessing passwords, spamming emails). */
export const CAPTCHA_ENDPOINTS = [
  "/sign-up/email",
  "/sign-in/email",
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
];

function createAuth(env: Env) {
  const db = getDb(env);
  const verifyEmail = emailAvailable(env);

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

    emailAndPassword: {
      enabled: true,
      // Until email can be delivered, accounts can't be verified, so don't require it yet.
      requireEmailVerification: verifyEmail,
      autoSignIn: !verifyEmail,
      // The "password" received is always the 64-hex browser-derived key.
      minPasswordLength: 64,
      maxPasswordLength: 64,
      password: passwordHasher(env.PASSWORD_PEPPER),
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: { autoSignInAfterVerification: true },

    socialProviders: googleEnabled(env)
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" } }
      : undefined,
    // Google verifies email ownership, so a Google sign-in may join an existing account with that email.
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },

    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh once a day
      // Signed JWT cookie with the session for 5 minutes: most API calls skip the D1 session lookup.
      cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "jwt" },
    },

    rateLimit: {
      enabled: true,
      storage: "database", // in-memory limits are per-isolate on Workers
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 300, max: 10 },
        "/sign-up/email": { window: 3600, max: 10 },
        "/email-otp/send-verification-otp": { window: 300, max: 5 },
        "/email-otp/verify-email": { window: 300, max: 10 },
        "/email-otp/request-password-reset": { window: 300, max: 5 },
        "/email-otp/reset-password": { window: 300, max: 10 },
        "/token": { window: 60, max: 30 },
      },
    },

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        storeOTP: "hashed",
        overrideDefaultEmailVerification: true, // verify email with a code, not a link
        sendVerificationOnSignUp: verifyEmail,
        async sendVerificationOTP({ email, otp, type }) {
          // Runs as a background task (Better Auth hides timing to prevent account enumeration),
          // so "email not configured" is rejected earlier, in the API router.
          const row = await enqueue(db, { channel: "email", recipient: email, kind: `otp:${type}`, payload: { otp } });
          await deliver(env, db, row); // try now; the cron retries on failure
        },
      }),
      jwt({
        // Don't sign a fresh JWT on every session check (wasted CPU); clients call /api/auth/token.
        disableSettingJwtHeader: true,
        jwks: { keyPairConfig: { alg: "EdDSA", crv: "Ed25519" } },
        jwt: {
          issuer: env.APP_URL,
          audience: env.APP_URL,
          expirationTime: "15m",
          definePayload: ({ user }) => ({ email: user.email, name: user.name, emailVerified: user.emailVerified }),
        },
      }),
      ...(turnstileEnabled(env)
        ? [captcha({ provider: "cloudflare-turnstile", secretKey: env.TURNSTILE_SECRET_KEY, endpoints: CAPTCHA_ENDPOINTS })]
        : []),
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
