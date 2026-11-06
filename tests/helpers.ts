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

/** Sign in with an email code, read from the outbox (no email provider in tests). Returns the cookie header. */
export async function signIn(email: string, ip: string, { checkWrongCode = false } = {}): Promise<string> {
  const send = await call("/api/auth/email-otp/send-verification-otp", { body: { email, type: "sign-in" }, ip });
  expect(send.status).toBe(200);
  const row = await db.select().from(outbox).where(eq(outbox.recipient, email)).orderBy(desc(outbox.createdAt)).get();
  const otp = String(row!.payload.otp);
  expect(otp).toMatch(/^\d{6}$/);

  if (checkWrongCode) {
    const wrong = await call("/api/auth/sign-in/email-otp", { body: { email, otp: otp === "000000" ? "111111" : "000000" }, ip });
    expect(wrong.status).toBe(400);
  }

  const res = await call("/api/auth/sign-in/email-otp", { body: { email, otp }, ip });
  expect(res.status).toBe(200);
  const cookies = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookies).toContain("session_token");
  return cookies;
}

export const userId = async (cookie: string) =>
  ((await (await call("/api/v1/me", { cookie })).json()) as { user: { id: string } }).user.id;

/** base64url(JSON) for the X-Report-Meta header. */
export const metaHeader = (meta: unknown) => btoa(JSON.stringify(meta)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Minimal bytes that pass the PDF signature check. */
export const pdfBytes = (body = "test report") => new TextEncoder().encode(`%PDF-1.4\n${body}\n%%EOF`);
