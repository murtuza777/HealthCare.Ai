import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import worker from "../src/worker";
import { getDb } from "../src/worker/db/client";
import { outbox } from "../src/worker/db/schema";

const origin = env.APP_URL;
const db = getDb(env);

async function call(path: string, init: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}) {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(origin + path, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: {
        origin,
        "content-type": "application/json",
        "cf-connecting-ip": init.ip ?? "203.0.113.1",
        ...(init.cookie ? { cookie: init.cookie } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

/** Sign in with an email code, read from the outbox (no email provider in tests). */
async function signIn(email: string, ip: string): Promise<string> {
  const send = await call("/api/auth/email-otp/send-verification-otp", { body: { email, type: "sign-in" }, ip });
  expect(send.status).toBe(200);
  const row = await db.select().from(outbox).where(eq(outbox.recipient, email)).orderBy(desc(outbox.createdAt)).get();
  const otp = String(row!.payload.otp);
  expect(otp).toMatch(/^\d{6}$/);

  const wrongCode = otp === "000000" ? "111111" : "000000";
  const wrong = await call("/api/auth/sign-in/email-otp", { body: { email, otp: wrongCode }, ip });
  expect(wrong.status).toBe(400);

  const res = await call("/api/auth/sign-in/email-otp", { body: { email, otp }, ip });
  expect(res.status).toBe(200);
  const cookies = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookies).toContain("session_token");
  return cookies;
}

describe("API", () => {
  it("rejects requests without a session", async () => {
    expect((await call("/api/v1/me")).status).toBe(401);
    expect((await call("/api/v1/patients/me/vitals")).status).toBe(401);
  });

  it("health check is public", async () => {
    expect((await call("/api/health")).status).toBe(200);
  });

  it("signs in with an email code and keeps each user's data separate", async () => {
    const alice = await signIn("alice@example.com", "203.0.113.10");
    const bob = await signIn("bob@example.com", "203.0.113.11");

    const me = await call("/api/v1/me", { cookie: alice });
    expect(me.status).toBe(200);
    const aliceId = ((await me.json()) as { user: { id: string } }).user.id;

    const added = await call("/api/v1/patients/me/vitals", { cookie: alice, body: { type: "blood_pressure", value: 128, value2: 82 } });
    expect(added.status).toBe(201);
    expect(((await added.json()) as { vital: { classification: string } }).vital.classification).toBe("high");

    const aliceList = (await (await call("/api/v1/patients/me/vitals", { cookie: alice })).json()) as { items: unknown[] };
    expect(aliceList.items).toHaveLength(1);
    const bobList = (await (await call("/api/v1/patients/me/vitals", { cookie: bob })).json()) as { items: unknown[] };
    expect(bobList.items).toHaveLength(0);

    // Bob can't read or write Alice's data by id.
    expect((await call(`/api/v1/patients/${aliceId}/vitals`, { cookie: bob })).status).toBe(403);
    expect((await call(`/api/v1/patients/${aliceId}/vitals`, { cookie: bob, body: { type: "heart_rate", value: 60 } })).status).toBe(403);
  });

  it("validates input", async () => {
    const carol = await signIn("carol@example.com", "203.0.113.12");
    const bad = await call("/api/v1/patients/me/vitals", { cookie: carol, body: { type: "blood_pressure", value: 120 } });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toBe("invalid_input");
  });

  it("rate-limits sign-in code requests per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await call("/api/auth/email-otp/send-verification-otp", {
        body: { email: `rl${i}@example.com`, type: "sign-in" },
        ip: "198.51.100.7",
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
