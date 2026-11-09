// Assistant conversations and the daily AI quota. Conversations are private to the patient:
// caretakers never see them.
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { aiUsage, conversations, messages } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const HISTORY_TURNS = 12;

export async function listConversations(db: Db, actor: Actor): Promise<Conversation[]> {
  return db.select().from(conversations).where(eq(conversations.userId, actor.userId)).orderBy(desc(conversations.updatedAt)).limit(50);
}

export async function ownConversation(db: Db, actor: Actor, id: string): Promise<Conversation | null> {
  const row = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, actor.userId)))
    .get();
  return row ?? null;
}

export async function getConversation(db: Db, actor: Actor, id: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  const conversation = await ownConversation(db, actor, id);
  if (!conversation) return null;
  const rows = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt)).limit(200);
  return { conversation, messages: rows };
}

/** Recent turns, oldest first, for the model's history. */
export async function recentTurns(db: Db, conversationId: string): Promise<Pick<Message, "role" | "content">[]> {
  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(HISTORY_TURNS);
  return rows.reverse();
}

/** Start or continue a conversation and save the patient's message. */
export async function addUserMessage(db: Db, actor: Actor, conversationId: string | undefined, content: string) {
  await assertAccess(db, actor, actor.userId, "owner");
  let conversation: Conversation | null | undefined = conversationId ? await ownConversation(db, actor, conversationId) : null;
  if (conversationId && !conversation) return null;
  if (!conversation) {
    const title = content.length > 60 ? `${content.slice(0, 57).trimEnd()}…` : content;
    [conversation] = await db.insert(conversations).values({ userId: actor.userId, title }).returning();
  } else {
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversation.id));
  }
  const [message] = await db.insert(messages).values({ conversationId: conversation!.id, role: "user", content }).returning();
  return { conversation: conversation!, message: message! };
}

export async function addAssistantMessage(db: Db, conversationId: string, content: string, tokens: { tokensIn?: number | null; tokensOut?: number | null } = {}) {
  // Created one millisecond after "now" at the latest so ordering is stable next to the user's message.
  const [row] = await db
    .insert(messages)
    .values({ conversationId, role: "assistant", content, tokensIn: tokens.tokensIn ?? null, tokensOut: tokens.tokensOut ?? null, createdAt: new Date(Date.now() + 1) })
    .returning();
  return row!;
}

/** Undo a question the model never answered: drop the message, and the conversation if it was new. */
export async function withdrawUserMessage(db: Db, saved: { conversation: Conversation; message: Message }, createdConversation: boolean) {
  if (createdConversation) await db.delete(conversations).where(eq(conversations.id, saved.conversation.id));
  else await db.delete(messages).where(eq(messages.id, saved.message.id));
}

export async function rateMessage(db: Db, actor: Actor, messageId: string, rating: -1 | 0 | 1): Promise<boolean> {
  const row = await db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(messages.id, messageId), eq(conversations.userId, actor.userId), eq(messages.role, "assistant")))
    .get();
  if (!row) return false;
  await db.update(messages).set({ rating: rating === 0 ? null : rating }).where(eq(messages.id, messageId));
  return true;
}

export async function deleteConversation(db: Db, actor: Actor, id: string): Promise<boolean> {
  const rows = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, actor.userId)))
    .returning({ id: conversations.id });
  return rows.length > 0;
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);

export async function usageToday(db: Db, actor: Actor, now = new Date()): Promise<number> {
  const row = await db
    .select({ requests: aiUsage.requests })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, actor.userId), eq(aiUsage.day, today(now))))
    .get();
  return row?.requests ?? 0;
}

/** Count one request against today's quota. Returns false (and counts nothing) when over the limit. */
export async function takeQuota(db: Db, actor: Actor, limit: number, now = new Date()): Promise<boolean> {
  const row = await db
    .insert(aiUsage)
    .values({ userId: actor.userId, day: today(now), requests: 1 })
    .onConflictDoUpdate({ target: [aiUsage.userId, aiUsage.day], set: { requests: sql`${aiUsage.requests} + 1` }, setWhere: sql`${aiUsage.requests} < ${limit}` })
    .returning({ requests: aiUsage.requests })
    .get();
  return Boolean(row);
}

/** Give back a request the model failed to answer. */
export async function refundQuota(db: Db, actor: Actor, now = new Date()) {
  await db
    .update(aiUsage)
    .set({ requests: sql`max(${aiUsage.requests} - 1, 0)` })
    .where(and(eq(aiUsage.userId, actor.userId), eq(aiUsage.day, today(now))));
}

export async function addTokens(db: Db, actor: Actor, tokens: number, now = new Date()) {
  if (!tokens) return;
  await db
    .update(aiUsage)
    .set({ tokens: sql`${aiUsage.tokens} + ${tokens}` })
    .where(and(eq(aiUsage.userId, actor.userId), eq(aiUsage.day, today(now))));
}
