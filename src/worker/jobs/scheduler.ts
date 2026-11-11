// One cron ("* * * * *") dispatches every job. Each job is idempotent and works in small batches.
import { getDb } from "../db/client";
import { dueForReminder, generateUpcomingDoses, markMissed, markReminded } from "../dal/doses";
import { queuePush } from "../dal/push";
import { drainOutbox } from "./outbox";
import { onMissedDoses } from "./care";
import { runDailyReview } from "./monitor";

export async function runScheduled(env: Env, now = new Date()) {
  const db = getDb(env);
  const minute = now.getUTCMinutes();
  const run = async (name: string, job: () => Promise<unknown>) => {
    try {
      await job();
    } catch (err) {
      console.error(`job ${name} failed`, err instanceof Error ? err.message : "unknown");
    }
  };

  // Hourly (and on the first minute after a deploy is fine too): make sure upcoming doses exist.
  if (minute === 0 || minute === 30) await run("generate-doses", () => generateUpcomingDoses(db, now));
  await run("dose-reminders", () => sendDoseReminders(db, now));
  if (minute % 5 === 0) await run("missed-doses", async () => onMissedDoses(env, db, await markMissed(db, now), now));
  await run("daily-review", () => runDailyReview(env, db, now));
  await run("outbox", () => drainOutbox(env));
}

/** Queue one push per due dose (grouped per patient so several medicines at 08:00 make one notification). */
export async function sendDoseReminders(db: ReturnType<typeof getDb>, now = new Date()) {
  const due = await dueForReminder(db, now);
  if (!due.length) return 0;
  const byUser = new Map<string, typeof due>();
  for (const d of due) byUser.set(d.event.userId, [...(byUser.get(d.event.userId) ?? []), d]);
  for (const [userId, items] of byUser) {
    const names = items.map((i) => `${i.name} ${i.dose}`);
    const single = items.length === 1 ? items[0]! : null;
    await queuePush(db, userId, "reminder:dose", {
      title: single ? `Time for ${single.name}` : `Time for ${items.length} medicines`,
      body: names.join(", "),
      url: "/app",
      tag: `dose-${items[0]!.event.scheduledAt.getTime()}`,
      data: { doses: items.map((i) => ({ medicationId: i.event.medicationId, scheduledAt: i.event.scheduledAt.toISOString() })) },
      actions: [{ action: "taken", title: single ? "Taken" : "Taken all" }],
    });
  }
  await markReminded(db, due.map((d) => d.event.id), now);
  return due.length;
}
