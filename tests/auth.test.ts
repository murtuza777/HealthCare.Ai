import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { DERIVED_KEY, passwordProblems } from "../src/shared/auth";
import worker from "../src/worker";
import { account, session, user } from "../src/worker/db/schema";
import { passwordHasher } from "../src/worker/password";
import { call, cookiesFrom, db, latestCode, randomKey, signIn } from "./helpers";

/** Call the Worker with a modified env (gets its own auth instance). */
async function callWith(overrides: Partial<Env>, path: string, body: unknown, ip = "198.51.100.90") {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(env.APP_URL + path, {
      method: "POST",
      headers: { origin: env.APP_URL, "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    }),
    { ...env, ...overrides },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

describe("password storage", () => {
  const hasher = passwordHasher("p".repeat(40));

  it("stores a salted HMAC of the derived key, never the key", async () => {
    const key = randomKey();
    const a = await hasher.hash(key);
    const b = await hasher.hash(key);
    expect(a).toMatch(/^hmac-v1\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(a).not.toContain(key);
    expect(a).not.toBe(b); // random salt per hash
    expect(await hasher.verify({ hash: a, password: key })).toBe(true);
    expect(await hasher.verify({ hash: a, password: randomKey() })).toBe(false);
  });

  it("refuses raw passwords", async () => {
    await expect(hasher.hash("correct horse battery staple")).rejects.toThrow();
    expect(await hasher.verify({ hash: await hasher.hash(randomKey()), password: "plain-password" })).toBe(false);
  });

  it("depends on the pepper", async () => {
    const key = randomKey();
    const stored = await hasher.hash(key);
    expect(await passwordHasher("q".repeat(40)).verify({ hash: stored, password: key })).toBe(false);
  });

  it("requires a strong pepper", () => {
    expect(() => passwordHasher("short")).toThrow();
  });
});

describe("client password rules", () => {
  it("flags weak passwords", () => {
    expect(passwordProblems("short")).not.toHaveLength(0);
    expect(passwordProblems("1234567890123")).toContain("Don't use only numbers.");
    expect(passwordProblems("aaaaaaaaaaaa")).toContain("Use a less repetitive password.");
    expect(passwordProblems("ravi-heart-2026!", "ravi@example.com")).toContain("Don't include your email address.");
    expect(passwordProblems("Blue-Kettle-Sunrise-42")).toEqual([]);
  });
  it("matches the derived key format", () => {
    expect(DERIVED_KEY.test(randomKey())).toBe(true);
    expect(DERIVED_KEY.test("Password123")).toBe(false);
  });
});

describe("sign-up, verification and sign-in", () => {
  it("exposes what the sign-in screen should offer", async () => {
    const res = await call("/api/auth-config");
    expect(await res.json()).toEqual({ google: false, emailVerification: true, turnstileSiteKey: null });
  });

  it("rejects a raw password sent to the API", async () => {
    const res = await call("/api/auth/sign-up/email", { body: { email: "raw@example.com", password: "my plain password", name: "Raw" }, ip: "198.51.100.60" });
    expect(res.status).toBe(400);
  });

  it("requires a verified email before signing in", async () => {
    const email = "unverified@example.com";
    const password = randomKey();
    expect((await call("/api/auth/sign-up/email", { body: { email, password, name: "U" }, ip: "198.51.100.61" })).status).toBe(200);
    const res = await call("/api/auth/sign-in/email", { body: { email, password }, ip: "198.51.100.61" });
    expect(res.status).toBe(403);
    expect(cookiesFrom(res)).not.toContain("session_token=");
  });

  it("signs in with the right password only, and stores no usable password", async () => {
    const email = "pw@example.com";
    const password = randomKey();
    await signIn(email, "198.51.100.62", { password });

    const ok = await call("/api/auth/sign-in/email", { body: { email, password }, ip: "198.51.100.62" });
    expect(ok.status).toBe(200);
    expect(cookiesFrom(ok)).toContain("session_token");

    const wrong = await call("/api/auth/sign-in/email", { body: { email, password: randomKey() }, ip: "198.51.100.62" });
    expect(wrong.status).toBe(401);

    const u = await db.select().from(user).where(eq(user.email, email)).get();
    const acct = await db.select().from(account).where(eq(account.userId, u!.id)).get();
    expect(acct!.password).toMatch(/^hmac-v1\$/);
    expect(acct!.password).not.toContain(password);
  });

  it("closes code-based sign-in", async () => {
    expect((await call("/api/auth/sign-in/email-otp", { body: { email: "pw@example.com", otp: "123456" } })).status).toBe(404);
    expect((await call("/api/auth/email-otp/send-verification-otp", { body: { email: "pw@example.com", type: "sign-in" } })).status).toBe(404);
  });

  it("resets a password with an emailed code and signs out other sessions", async () => {
    const email = "reset@example.com";
    const oldKey = randomKey();
    const ip = "198.51.100.63";
    await signIn(email, ip, { password: oldKey });
    const uid = (await db.select().from(user).where(eq(user.email, email)).get())!.id;
    expect((await db.select().from(session).where(eq(session.userId, uid))).length).toBeGreaterThan(0);

    expect((await call("/api/auth/email-otp/request-password-reset", { body: { email }, ip })).status).toBe(200);
    const otp = await latestCode(email, "otp:forget-password");
    const newKey = randomKey();
    expect((await call("/api/auth/email-otp/reset-password", { body: { email, otp, password: newKey }, ip })).status).toBe(200);

    expect((await db.select().from(session).where(eq(session.userId, uid))).length).toBe(0); // all sessions revoked
    expect((await call("/api/auth/sign-in/email", { body: { email, password: oldKey }, ip })).status).toBe(401);
    expect((await call("/api/auth/sign-in/email", { body: { email, password: newKey }, ip })).status).toBe(200);
  });

  it("rate-limits password guessing per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await call("/api/auth/sign-in/email", { body: { email: "pw@example.com", password: randomKey() }, ip: "198.51.100.70" });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("JWT access tokens", () => {
  it("issues an EdDSA token the API accepts as a bearer token", async () => {
    const cookie = await signIn("jwt@example.com", "198.51.100.64");
    const tokenRes = await call("/api/auth/token", { cookie });
    expect(tokenRes.status).toBe(200);
    const { token } = (await tokenRes.json()) as { token: string };
    const header = JSON.parse(atob(token.split(".")[0]!.replace(/-/g, "+").replace(/_/g, "/")));
    expect(header.alg).toBe("EdDSA");

    const me = await call("/api/v1/me", { headers: { authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { email: string } }).user.email).toBe("jwt@example.com");

    const jwks = (await (await call("/api/auth/jwks")).json()) as { keys: { kty: string; crv: string; d?: string }[] };
    expect(jwks.keys[0]).toMatchObject({ kty: "OKP", crv: "Ed25519" });
    expect(jwks.keys[0]).not.toHaveProperty("d"); // never the private key
  });

  it("rejects tampered or garbage tokens", async () => {
    const cookie = await signIn("jwt2@example.com", "198.51.100.65");
    const { token } = (await (await call("/api/auth/token", { cookie })).json()) as { token: string };
    const [h, p, s] = token.split(".");
    const payload = JSON.parse(atob(p!.replace(/-/g, "+").replace(/_/g, "/")));
    const forged = btoa(JSON.stringify({ ...payload, sub: "someone-else" })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect((await call("/api/v1/me", { headers: { authorization: `Bearer ${h}.${forged}.${s}` } })).status).toBe(401);
    expect((await call("/api/v1/me", { headers: { authorization: "Bearer not-a-jwt" } })).status).toBe(401);
  });
});

describe("configuration-dependent behaviour", () => {
  it("returns 503 instead of pretending to email a code when email isn't configured", async () => {
    const prod = { EMAIL_MODE: "", RESEND_API_KEY: "" };
    expect((await callWith(prod, "/api/auth/email-otp/send-verification-otp", { email: "x@example.com", type: "email-verification" })).status).toBe(503);
    expect((await callWith(prod, "/api/auth/email-otp/request-password-reset", { email: "x@example.com" })).status).toBe(503);
  });

  it("lets people sign up and in without verification until email is configured", async () => {
    const prod = { EMAIL_MODE: "", RESEND_API_KEY: "" };
    const res = await callWith(prod, "/api/auth/sign-up/email", { email: "early@example.com", password: randomKey(), name: "Early" }, "198.51.100.80");
    expect(res.status).toBe(200);
    expect(cookiesFrom(res)).toContain("session_token");
  });

  it("requires a Turnstile token when Turnstile is configured", async () => {
    const withTurnstile = { TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" };
    const res = await callWith(withTurnstile, "/api/auth/sign-up/email", { email: "bot@example.com", password: randomKey(), name: "Bot" }, "198.51.100.81");
    expect(res.status).toBe(400);
  });
});
