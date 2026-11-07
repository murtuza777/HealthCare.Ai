import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { outbox } from "../db/schema";
import { renderEmail, sendEmail } from "../notifications/email";
import { pushConfigured, PushGone, sendPush, type PushPayload } from "../notifications/push";
import { deletePushSubscriptionById, getPushSubscription } from "../dal/push";

const MAX_ATTEMPTS = 5;
const BATCH = 10; // small batches keep each cron run inside the CPU budget

type Row = typeof outbox.$inferSelect;

/** Queue a message. Delivery happens immediately when possible, otherwise on the next cron run. */
export async function enqueue(db: Db, msg: Pick<Row, "channel" | "recipient" | "kind" | "payload">) {
  const [row] = await db.insert(outbox).values(msg).returning();
  return row!;
}

export async function deliver(env: Env, db: Db, row: Row): Promise<boolean> {
  if (row.channel === "email" && !env.RESEND_API_KEY) return false;
  if (row.channel === "push" && !pushConfigured(env)) return false;
  try {
    if (row.channel === "push") {
      const sub = await getPushSubscription(db, row.recipient);
      if (!sub) {
        await db.update(outbox).set({ status: "failed", lastError: "subscription removed" }).where(eq(outbox.id, row.id));
        return false;
      }
      try {
        await sendPush(env, { endpoint: sub.endpoint, keys: sub.keys }, row.payload as PushPayload);
      } catch (err) {
        if (err instanceof PushGone) {
          await deletePushSubscriptionById(db, sub.id);
          await db.update(outbox).set({ status: "failed", lastError: "subscription gone" }).where(eq(outbox.id, row.id));
          return false;
        }
        throw err;
      }
      await db.update(outbox).set({ status: "sent", sentAt: new Date() }).where(eq(outbox.id, row.id));
      return true;
    }
    await sendEmail(env, { to: row.recipient, ...renderEmail(row.kind, row.payload) });
    // Sent: scrub secrets (login codes) from the stored payload.
    await db.update(outbox).set({ status: "sent", sentAt: new Date(), payload: { redacted: true } }).where(eq(outbox.id, row.id));
    return true;
  } catch (err) {
    const attempts = row.attempts + 1;
    await db
      .update(outbox)
      .set({ attempts, status: attempts >= MAX_ATTEMPTS ? "failed" : "pending", lastError: String(err).slice(0, 300) })
      .where(eq(outbox.id, row.id));
    return false;
  }
}

/** Cron: send pending messages and remove old login-code rows. */
export async function drainOutbox(env: Env) {
  const db = getDb(env);
  // Only pick up channels that can be delivered, so undeliverable rows never block the batch.
  const channels = [env.RESEND_API_KEY ? "email" : null, pushConfigured(env) ? "push" : null].filter(Boolean) as ("email" | "push")[];
  const pending = channels.length
    ? await db
        .select()
        .from(outbox)
        .where(and(eq(outbox.status, "pending"), lt(outbox.attempts, MAX_ATTEMPTS), inArray(outbox.channel, channels)))
        .orderBy(outbox.createdAt)
        .limit(BATCH)
    : [];
  for (const row of pending) await deliver(env, db, row);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db.select({ id: outbox.id, kind: outbox.kind }).from(outbox).where(lt(outbox.createdAt, dayAgo)).limit(100);
  // Old login codes and old reminders are useless (and codes are secrets): remove them.
  const otpIds = stale.filter((r) => r.kind.startsWith("otp:") || r.kind.startsWith("reminder:")).map((r) => r.id);
  if (otpIds.length) await db.delete(outbox).where(inArray(outbox.id, otpIds));
}
