import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { emergencyInText, emergencyKindOf, emergencyReply } from "../src/shared/assistant";
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
    ["I'm thinking about suicide", "self_harm"],
    // Plain present-tense descriptions, with nothing else said.
    ["chest pain", "cardiac"],
    ["I have chest pain", "cardiac"],
    ["I feel pressure in my chest", "cardiac"],
    ["my chest hurts right now", "cardiac"],
    ["I have chest pain, could it be angina?", "cardiac"],
    ["I don't know why my chest hurts", "cardiac"],
    ["my left arm is numb and my chest feels tight", "cardiac"],
    ["my heart is racing and I feel dizzy", "cardiac"],
    ["seene mein dard ho raha hai", "cardiac"],
    ["worst headache of my life", "stroke"],
    ["my vision went blurry suddenly and I can't move my arm", "stroke"],
    ["I can't catch my breath", "breathing"],
    ["I'm short of breath at rest", "breathing"],
    ["my lips are turning blue", "breathing"],
    ["I have no chest pain but I'm short of breath at rest", "breathing"],
    ["I feel like passing out", "fainting"],
    ["I took too many pills", "overdose"],
  ])("flags %j as %s", (text, kind) => {
    const r = emergencyInText(text);
    expect(r.emergency).toBe(true);
    if (r.emergency) expect(r.kind).toBe(kind);
  });

  // Talking about an emergency symptom is not having one: the assistant answers, with the number shown.
  it.each([
    ["Could I have a heart attack if my blood pressure stays this high?", "cardiac"],
    ["What should I do if someone is having a heart attack?", "cardiac"],
    ["I do not have chest pain or shortness of breath, just a mild headache", "cardiac"],
    ["Had some chest pain last year, what questions should I ask my doctor?", "cardiac"],
    ["What can cause chest pain?", "cardiac"],
    ["what if I have chest pain at night", "cardiac"],
    ["I fainted last year, should I tell my doctor?", "fainting"],
    ["Should I worry about fainting?", "fainting"],
  ])("treats %j as a mention of %s", (text, kind) => {
    expect(emergencyInText(text)).toEqual({ emergency: false, mention: kind });
  });

  it.each([
    "How has my blood pressure changed this month?",
    "What does a heart rate of 74 mean?",
    "Is 138/86 high?",
    "What are the signs of a stroke?",
    "When can I end my amlodipine course?",
    "I hurt myself while exercising",
    "I took a double dose by mistake",
  ])("does not flag %j", (text) => {
    expect(emergencyInText(text)).toEqual({ emergency: false });
  });

  it("gives instructions that fit the emergency", () => {
    const stroke = emergencyInText("her face is drooping");
    if (!stroke.emergency) throw new Error("expected an emergency");
    const reply = emergencyReply(stroke, "112");
    expect(reply).toContain("Call 112 now");
    expect(reply).not.toMatch(/nitroglycerin/i);
    expect(emergencyKindOf(reply)).toBe("stroke");
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

    await call("/api/v1/patients/me/vitals", { cookie, body: { type: "blood_pressure", value: 185, value2: 121 } });
    const after = await buildPatientContext(db, { userId: await userId(cookie) });
    expect(after.text).toMatch(/Blood pressure: 185\/121 mmHg \(EMERGENCY RANGE\)/);
  });

  it("answers questions that only mention an emergency symptom", async () => {
    const cookie = await signIn("assist-mention@example.com", "198.51.100.48");
    const res = await call("/api/v1/assistant/chat", { cookie, body: { message: "Could I have a heart attack if my blood pressure stays this high?" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("[test model]");
  });

  it("saves nothing when a question is refused", async () => {
    const cookie = await baseSignIn("assist-refused@example.com", "198.51.100.49");
    expect((await call("/api/v1/assistant/chat", { cookie, body: { message: "Is 138/86 high?" } })).status).toBe(403);
    const list = (await (await call("/api/v1/assistant/conversations", { cookie })).json()) as { items: unknown[] };
    expect(list.items).toHaveLength(0);

    // In an existing conversation, a refused question doesn't leave a message without a reply.
    await call("/api/v1/account/consents", { cookie, body: { kinds: ["ai_processing"] } });
    const first = await call("/api/v1/assistant/chat", { cookie, body: { message: "Is 138/86 high?" } });
    const id = first.headers.get("x-conversation-id")!;
    await first.text();
    const actor = { userId: await userId(cookie) };
    const limit = Number(env.AI_DAILY_LIMIT);
    while (await takeQuota(db, actor, limit));
    expect((await call("/api/v1/assistant/chat", { cookie, body: { conversationId: id, message: "And my heart rate?" } })).status).toBe(429);
    const convo = (await (await call(`/api/v1/assistant/conversations/${id}`, { cookie })).json()) as { messages: { role: string }[] };
    expect(convo.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
  });
});
