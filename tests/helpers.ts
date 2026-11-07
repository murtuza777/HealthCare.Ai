import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { expect } from "vitest";
import worker from "../src/worker";
import { getDb } from "../src/worker/db/client";
import { outbox } from "../src/worker/db/schema";

export const origin = env.APP_URL;
export const db = getDb(env);

export type CallInit = { method?: string; body?: unknown; raw?: BodyInit; headers?: Record<string, string>; cookie?: string; ip?: string };

/** Call the Worker in-process, like a browser on APP_URL would. */
export async function call(path: string, init: CallInit = {}) {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(origin + path, {
      method: init.method ?? (init.body !== undefined || init.raw !== undefined ? "POST" : "GET"),
      headers: {
        origin,
        ...(init.raw === undefined ? { "content-type": "application/json" } : {}),
        "cf-connecting-ip": init.ip ?? "203.0.113.1",
        ...(init.cookie ? { cookie: init.cookie } : {}),
        ...init.headers,
      },
      body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

/**
 * A browser-derived password key (what the client sends instead of the password; see src/shared/auth.ts).
 * The server can't tell how it was derived, so tests use random keys instead of running 600k PBKDF2 rounds.
 */
export const randomKey = () => [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");

export const cookiesFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

/** Latest code emailed to an address (tests run with EMAIL_MODE=outbox). */
export async function latestCode(email: string, kind?: string): Promise<string> {
  const rows = await db.select().from(outbox).where(eq(outbox.recipient, email)).orderBy(desc(outbox.createdAt));
  const row = rows.find((r) => !kind || r.kind === kind);
  const otp = String(row?.payload.otp ?? "");
  expect(otp).toMatch(/^\d{6}$/);
  return otp;
}

/**
 * Sign up with email + password, verify the email with the emailed code, and return the session cookie.
 * Verification signs the user in (autoSignInAfterVerification).
 */
export async function signIn(email: string, ip: string, { checkWrongCode = false, password = randomKey() } = {}): Promise<string> {
  const up = await call("/api/auth/sign-up/email", { body: { email, password, name: email.split("@")[0] }, ip });
  expect(up.status).toBe(200);
  const otp = await latestCode(email, "otp:email-verification");

  if (checkWrongCode) {
    const wrong = await call("/api/auth/email-otp/verify-email", { body: { email, otp: otp === "000000" ? "111111" : "000000" }, ip });
    expect(wrong.status).toBe(400);
  }

  const res = await call("/api/auth/email-otp/verify-email", { body: { email, otp }, ip });
  expect(res.status).toBe(200);
  const cookies = cookiesFrom(res);
  expect(cookies).toContain("session_token");
  return cookies;
}

export const userId = async (cookie: string) =>
  ((await (await call("/api/v1/me", { cookie })).json()) as { user: { id: string } }).user.id;

/** base64url(JSON) for the X-Report-Meta header. */
export const metaHeader = (meta: unknown) => btoa(JSON.stringify(meta)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Minimal bytes that pass the PDF signature check. */
export const pdfBytes = (body = "test report") => new TextEncoder().encode(`%PDF-1.4\n${body}\n%%EOF`);
