// /api/v1/assistant/...  The patient's own assistant. Order of checks for every message:
// 1) rule-based emergency check (no AI), 2) daily quota, 3) context from the DAL, 4) model.
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { chatInputSchema, emergencyInText, emergencyReply } from "../../shared/assistant";
import { buildPatientContext } from "../ai/context";
import { aiAvailable, completeChat, streamChat, type ChatMessage } from "../ai/model";
import { systemPrompt, visitQuestionsPrompt } from "../ai/prompt";
import {
  addAssistantMessage,
  addTokens,
  addUserMessage,
  deleteConversation,
  getConversation,
  listConversations,
  rateMessage,
  recentTurns,
  takeQuota,
  usageToday,
} from "../dal/assistant";
import { notFound, parse } from "../middleware/validate";
import { consentStatus } from "../dal/account";
import type { AppEnv } from "../types";

const dailyLimit = (env: Env) => Number(env.AI_DAILY_LIMIT) || 25;
const ratingBody = z.object({ rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]) });

export const assistant = new Hono<AppEnv>()
  .get("/status", async (c) => {
    const used = await usageToday(c.var.db, c.var.actor);
    const limit = dailyLimit(c.env);
    const consented = (await consentStatus(c.var.db, c.var.actor)).ai_processing;
    return c.json({ available: aiAvailable(c.env), consented, limit, remaining: Math.max(0, limit - used) });
  })
  .get("/conversations", async (c) => {
    const items = await listConversations(c.var.db, c.var.actor);
    return c.json({ items: items.map(({ id, title, updatedAt }) => ({ id, title, updatedAt })) });
  })
  .get("/conversations/:id", async (c) => {
    const found = await getConversation(c.var.db, c.var.actor, c.req.param("id"));
    if (!found) notFound();
    return c.json({
      conversation: { id: found.conversation.id, title: found.conversation.title },
      messages: found.messages
        .filter((m) => m.role !== "tool")
        .map(({ id, role, content, rating, createdAt }) => ({ id, role, content, rating, createdAt })),
    });
  })
  .delete("/conversations/:id", async (c) => {
    if (!(await deleteConversation(c.var.db, c.var.actor, c.req.param("id")))) notFound();
    return c.json({ ok: true });
  })
  .post(
    "/messages/:id/rating",
    validator("json", (v) => parse(ratingBody, v)),
    async (c) => {
      if (!(await rateMessage(c.var.db, c.var.actor, c.req.param("id"), c.req.valid("json").rating))) notFound();
      return c.json({ ok: true });
    },
  )
  // Suggested questions for the visit summary. Same consent and quota as chat.
  .post("/visit-questions", async (c) => {
    const { db, actor } = c.var;
    if (!aiAvailable(c.env)) return c.json({ kind: "unavailable" as const }, 503);
    if (!(await consentStatus(db, actor)).ai_processing) return c.json({ kind: "consent" as const }, 403);
    if (!(await takeQuota(db, actor, dailyLimit(c.env)))) return c.json({ kind: "quota" as const }, 429);
    const ctx = await buildPatientContext(db, actor);
    try {
      const result = await completeChat(c.env, [{ role: "user", content: visitQuestionsPrompt(ctx.text) }]);
      await addTokens(db, actor, (result.tokensIn ?? 0) + (result.tokensOut ?? 0));
      const questions = result.text
        .split("\n")
        .map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim())
        .filter((l) => l.length > 3 && l.length < 300)
        .slice(0, 6);
      return c.json({ kind: "ok" as const, questions });
    } catch (err) {
      console.error("visit questions model error", err instanceof Error ? err.name : "unknown");
      return c.json({ kind: "unavailable" as const }, 503);
    }
  })
  .post(
    "/chat",
    validator("json", (v) => parse(chatInputSchema, v)),
    async (c) => {
      const { db, actor } = c.var;
      const input = c.req.valid("json");

      const saved = await addUserMessage(db, actor, input.conversationId, input.message);
      if (!saved) notFound();
      const conversationId = saved.conversation.id;

      // 1. Emergencies get a fixed, human-written answer, whether or not AI is available.
      const emergency = emergencyInText(input.message);
      if (emergency.emergency) {
        const ctx = await buildPatientContext(db, actor);
        const reply = await addAssistantMessage(db, conversationId, emergencyReply(emergency, ctx.emergencyNumber));
        return c.json({ kind: "emergency" as const, conversationId, reason: emergency.reason, number: ctx.emergencyNumber, message: { id: reply.id, content: reply.content } });
      }

      // The patient must have agreed to their record being processed by the AI model.
      if (!(await consentStatus(db, actor)).ai_processing) {
        return c.json({ kind: "consent" as const, conversationId }, 403);
      }

      if (!aiAvailable(c.env)) {
        return c.json({ kind: "unavailable" as const, conversationId }, 503);
      }

      // 2. Quota.
      if (!(await takeQuota(db, actor, dailyLimit(c.env)))) {
        return c.json({ kind: "quota" as const, conversationId }, 429);
      }

      // 3. Context, loaded server-side.
      const [ctx, history] = await Promise.all([buildPatientContext(db, actor), recentTurns(db, conversationId)]);
      const chat: ChatMessage[] = [
        { role: "system", content: systemPrompt(ctx.text, ctx.emergencyNumber) },
        ...history.filter((m) => m.role !== "tool").map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      // 4. Stream the reply; save it once it is complete.
      let stream: ReadableStream<Uint8Array>;
      try {
        stream = await streamChat(c.env, chat, async (result) => {
          const text = result.text.trim() || "Sorry, I couldn't put an answer together. Please try asking another way.";
          const work = Promise.all([
            addAssistantMessage(db, conversationId, text, result),
            addTokens(db, actor, (result.tokensIn ?? 0) + (result.tokensOut ?? 0)),
          ]);
          try {
            c.executionCtx.waitUntil(work);
          } catch {
            await work; // no execution context (tests)
          }
        });
      } catch (err) {
        console.error("assistant model error", err instanceof Error ? err.name : "unknown");
        return c.json({ kind: "unavailable" as const, conversationId }, 503);
      }

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Conversation-Id": conversationId,
          "X-Content-Type-Options": "nosniff",
        },
      });
    },
  );
