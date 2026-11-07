// Push subscriptions (one per browser/device) and queueing notifications for a user.
// Delivery happens in the outbox job, so a slow push service never delays a request.
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { outbox, pushSubscriptions } from "../db/schema";
import type { PushPayload, PushSubscriptionKeys } from "../notifications/push";
import { assertAccess, type Actor } from "./authz";

export async function savePushSubscription(db: Db, actor: Actor, sub: { endpoint: string; keys: PushSubscriptionKeys }) {
  await assertAccess(db, actor, actor.userId, "owner");
  // An endpoint belongs to one browser; if someone else signs in on it, it moves to them.
  await db
    .insert(pushSubscriptions)
    .values({ userId: actor.userId, endpoint: sub.endpoint, keys: sub.keys })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: actor.userId, keys: sub.keys } });
}

export async function removePushSubscription(db: Db, actor: Actor, endpoint: string): Promise<boolean> {
  const rows = await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, actor.userId)))
    .returning({ id: pushSubscriptions.id });
  return rows.length > 0;
}

export async function countPushSubscriptions(db: Db, actor: Actor): Promise<number> {
  const rows = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, actor.userId));
  return rows.length;
}

export async function getPushSubscription(db: Db, id: string) {
  return (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, id)).get()) ?? null;
}

export async function deletePushSubscriptionById(db: Db, id: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}

/** Queue a push to every device of a user. Returns how many devices it was queued for. */
export async function queuePush(db: Db, userId: string, kind: string, payload: PushPayload): Promise<number> {
  const subs = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  if (!subs.length) return 0;
  await db.insert(outbox).values(subs.map((s) => ({ channel: "push" as const, recipient: s.id, kind, payload })));
  return subs.length;
}
