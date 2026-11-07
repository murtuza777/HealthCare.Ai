import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { emergencyInText } from "../src/shared/assistant";
import { buildPatientContext } from "../src/worker/ai/context";
import { takeQuota } from "../src/worker/dal/assistant";
import { call, db, signIn as baseSignIn, userId } from "./helpers";

// Assistant users have agreed to AI processing (tested separately below).
async function signIn(email: string, ip: string) {
  const cookie = await baseSignIn(email, ip);
  await call("/api/v1/account/consents", { cookie, body: { kinds: ["ai_processing"] } });
  return cookie;
}

describe("emergencyInText (rule-based, runs before any model)", () => {
  it.each([
    ["I have chest pain and I'm short of breath", "cardiac"],
    ["crushing pain in my chest going down my left arm", "cardiac"],
    ["I think I'm having a heart attack", "cardiac"],
    ["my dad's face is drooping and his speech is slurred", "stroke"],
    ["sudden numbness on one side of my body", "stroke"],
    ["I can't breathe properly", "breathing"],
    ["I fainted this morning", "fainting"],
    ["I want to end my life", "self_harm"],
  ])("flags %j as %s", (text, kind) => {
    const r = emergencyInText(text);
    expect(r.emergency).toBe(true);
    if (r.emergency) expect(r.kind).toBe(kind);
  });

  it.each([
    "How has my blood pressure changed this month?",
    "What does a heart rate of 74 mean?",
    "Had some chest pain last year, what questions should I ask my doctor?",
    "Is 138/86 high?",
  ])("does not flag %j", (text) => {
    expect(emergencyInText(text).emergency).toBe(false);
  });
});

describe("assistant API", () => {
  it("answers emergencies with the fixed reply, without the model or the quota", async () => {
    const cookie = await signIn("assist-emergency@example.com", "198.51.100.40");
    const res = await call("/api/v1/assistant/chat", { cookie, body: { message: "Chest pain and sweating right now" } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { kind: string; number: string; message: { content: string } };
    expect(body.kind).toBe("emergency");
    expect(body.message.content).toContain(`Call ${body.number} now`);
    const status = (await (await call("/api/v1/assistant/status", { cookie })).json()) as { remaining: number; limit: number };
    expect(status.remaining).toBe(status.limit);
  });

  it("streams a reply, saves the conversation and counts the quota", async () => {
    const cookie = await signIn("assist-chat@example.com", "198.51.100.41");
    const res = await call("/api/v1/assistant/chat", { cookie, body: { message: "What do my latest readings mean?" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const conversationId = res.headers.get("x-conversation-id")!;
    expect(await res.text()).toContain("[test model]");

    const convo = (await (await call(`/api/v1/assistant/conversations/${conversationId}`, { cookie })).json()) as {
      messages: { id: string; role: string; content: string }[];
    };
    expect(convo.messages.map((m) => m.role)).toEqual(["user", "assistant"]);

    const rate = await call(`/api/v1/assistant/messages/${convo.messages[1]!.id}/rating`, { cookie, body: { rating: 1 } });
    expect(rate.status).toBe(200);

    const status = (await (await call("/api/v1/assistant/status", { cookie })).json()) as { remaining: number; limit: number };
    expect(status.remaining).toBe(status.limit - 1);
  });

  it("keeps conversations private to their owner", async () => {
    const a = await signIn("assist-owner@example.com", "198.51.100.42");
    const b = await signIn("assist-other@example.com", "198.51.100.43");
    const res = await call("/api/v1/assistant/chat", { cookie: a, body: { message: "Is 138/86 high?" } });
    const id = res.headers.get("x-conversation-id")!;
    await res.text();

    expect((await call(`/api/v1/assistant/conversations/${id}`, { cookie: b })).status).toBe(404);
    expect((await call("/api/v1/assistant/chat", { cookie: b, body: { conversationId: id, message: "hello" } })).status).toBe(404);
    expect((await call(`/api/v1/assistant/conversations/${id}`, { cookie: b, method: "DELETE" })).status).toBe(404);
    expect((await call(`/api/v1/assistant/conversations/${id}`, { cookie: a, method: "DELETE" })).status).toBe(200);
  });

  it("needs consent to AI processing, except for emergencies", async () => {
    const cookie = await baseSignIn("assist-consent@example.com", "198.51.100.46");
    expect((await call("/api/v1/assistant/chat", { cookie, body: { message: "Is 138/86 high?" } })).status).toBe(403);
    expect((await call("/api/v1/assistant/chat", { cookie, body: { message: "I fainted this morning" } })).status).toBe(200);
    await call("/api/v1/account/consents", { cookie, body: { kinds: ["ai_processing"] } });
    const ok = await call("/api/v1/assistant/chat", { cookie, body: { message: "Is 138/86 high?" } });
    expect(ok.status).toBe(200);
    await ok.text();
  });

  it("suggests questions for a doctor's visit", async () => {
    const cookie = await signIn("assist-visit@example.com", "198.51.100.47");
    const res = (await (await call("/api/v1/assistant/visit-questions", { cookie, method: "POST" })).json()) as { kind: string; questions: string[] };
    expect(res.kind).toBe("ok");
    expect(res.questions).toEqual(["[test model] How is my blood pressure trend?", "[test model] Should my medicines be reviewed?"]);
  });

  it("stops at the daily limit", async () => {
    const cookie = await signIn("assist-quota@example.com", "198.51.100.44");
    const actor = { userId: await userId(cookie) };
    const limit = Number(env.AI_DAILY_LIMIT);
    for (let i = 0; i < limit; i++) expect(await takeQuota(db, actor, limit)).toBe(true);
    expect(await takeQuota(db, actor, limit)).toBe(false);
    const res = await call("/api/v1/assistant/chat", { cookie, body: { message: "What should I ask my cardiologist?" } });
    expect(res.status).toBe(429);
  });

  it("builds the model's context from the patient's own record", async () => {
    const cookie = await signIn("assist-context@example.com", "198.51.100.45");
    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "blood_pressure", value: 150, value2: 95 } });
    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "blood_pressure", value: 140, value2: 90 } });
    const ctx = await buildPatientContext(db, { userId: await userId(cookie) });
    expect(ctx.text).toMatch(/Blood pressure: 140\/90 mmHg \(high\)/);
    expect(ctx.text).toMatch(/Blood pressure trend: 2 readings/);
    expect(ctx.text).toContain("Current medicines: none recorded.");
  });
});
