// /api/v1/push/...  Reminders on this device (Web Push).
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { getProfile, upsertProfile } from "../dal/profile";
import { countPushSubscriptions, queuePush, removePushSubscription, savePushSubscription } from "../dal/push";
import { drainOutbox } from "../jobs/outbox";
import { pushConfigured } from "../notifications/push";
import { parse } from "../middleware/validate";
import type { AppEnv } from "../types";

const b64url = z.string().regex(/^[A-Za-z0-9_-]+$/).max(200);
const subscribeBody = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://"), "Push endpoints must use HTTPS"),
  keys: z.object({ p256dh: b64url, auth: b64url }),
  timezone: z.string().min(1).max(64).optional(),
});
const unsubscribeBody = z.object({ endpoint: z.string().max(1000) });

const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const push = new Hono<AppEnv>()
  .get("/status", async (c) =>
    c.json({ configured: pushConfigured(c.env), publicKey: pushConfigured(c.env) ? c.env.VAPID_PUBLIC_KEY : null, devices: await countPushSubscriptions(c.var.db, c.var.actor) }),
  )
  .post(
    "/subscribe",
    validator("json", (v) => parse(subscribeBody, v)),
    async (c) => {
      const { endpoint, keys, timezone } = c.req.valid("json");
      await savePushSubscription(c.var.db, c.var.actor, { endpoint, keys });
      // Reminders follow the patient's local time; adopt the device's timezone if none is set yet.
      if (timezone && validTz(timezone)) {
        const profile = await getProfile(c.var.db, c.var.actor, c.var.actor.userId);
        if (!profile?.timezone || profile.timezone === "UTC") await upsertProfile(c.var.db, c.var.actor, c.var.actor.userId, { timezone });
      }
      return c.json({ ok: true }, 201);
    },
  )
  .post(
    "/unsubscribe",
    validator("json", (v) => parse(unsubscribeBody, v)),
    async (c) => {
      await removePushSubscription(c.var.db, c.var.actor, c.req.valid("json").endpoint);
      return c.json({ ok: true });
    },
  )
  .post("/test", async (c) => {
    const queued = await queuePush(c.var.db, c.var.actor.userId, "reminder:test", {
      title: "Reminders are on",
      body: "You'll get a notification like this when it's time for a medicine.",
      url: "/app/medications",
      tag: "test",
    });
    if (queued) c.executionCtx.waitUntil(drainOutbox(c.env));
    return c.json({ queued });
  });
