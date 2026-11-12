// Alerts: things a patient's caretakers should know about. Raised by fixed rules, never by AI.
// Each alert is stored once and pushed (and emailed, when email is set up) to caretakers who
// have the "alerts" permission.
import { and, desc, eq, gte } from "drizzle-orm";
import type { Db } from "../db/client";
import { alerts, outbox } from "../db/schema";
import { assertAccess, type Actor } from "./authz";
import { inQuietHours } from "../../shared/care";
import { alertRecipients } from "./care";
import { queuePush } from "./push";

export type AlertInput = {
  severity: "info" | "warning" | "critical";
  kind: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Title for caretakers' notifications, when it should name the patient. Not stored. */
  notifyTitle?: string;
};

/** Store an alert for the patient and notify their caretakers. Duplicate kinds within `dedupeMs` are dropped. */
export async function raiseAlert(env: Pick<Env, "APP_URL" | "RESEND_API_KEY">, db: Db, patientId: string, input: AlertInput, dedupeMs = 0, now = new Date()) {
  if (dedupeMs) {
    const recent = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(and(eq(alerts.userId, patientId), eq(alerts.kind, input.kind), gte(alerts.createdAt, new Date(now.getTime() - dedupeMs))))
      .get();
    if (recent) return null;
  }
  const { notifyTitle, ...stored } = input;
  const [alert] = await db.insert(alerts).values({ userId: patientId, source: "rule", ...stored }).returning();
  const recipients = await alertRecipients(db, patientId);
  const url = `/app/care/${patientId}`;
  const title = notifyTitle ?? input.title;
  for (const r of recipients) {
    // Quiet hours hold back everything except emergencies; the alert still waits on their dashboard.
    if (input.severity !== "critical" && inQuietHours(r.prefs?.quietHours, now, r.timezone)) continue;
    const channels = r.prefs?.channels ?? ["push", "email"];
    const pushed = channels.includes("push") ? await queuePush(db, r.caretakerId, `care:alert`, { title, body: input.body, url, tag: `alert-${alert!.id}` }) : 0;
    // Email when it's critical, or when the caretaker has no device set up for push.
    if (env.RESEND_API_KEY && channels.includes("email") && (input.severity === "critical" || !pushed)) {
      await db.insert(outbox).values({ channel: "email", recipient: r.email, kind: "care:alert", payload: { title, body: input.body, url: `${env.APP_URL}${url}` } });
    }
  }
  return alert!;
}

export async function listAlerts(db: Db, actor: Actor, patientId: string, limit = 20) {
  await assertAccess(db, actor, patientId, "alerts");
  return db.select().from(alerts).where(eq(alerts.userId, patientId)).orderBy(desc(alerts.createdAt)).limit(limit);
}

/**
 * Mark an alert as seen. The patient and their caretakers each have their own mark: a
 * caretaker's "seen" must not hide a finding from the patient, or the other way round.
 */
export async function acknowledgeAlert(db: Db, actor: Actor, patientId: string, alertId: string) {
  await assertAccess(db, actor, patientId, "alerts");
  const alert = await db.select().from(alerts).where(and(eq(alerts.id, alertId), eq(alerts.userId, patientId))).get();
  if (!alert) return false;
  if (actor.userId === patientId) {
    await db.update(alerts).set({ data: { ...(alert.data ?? {}), patientSeenAt: new Date().toISOString() } }).where(eq(alerts.id, alertId));
  } else if (!alert.acknowledgedAt) {
    await db.update(alerts).set({ acknowledgedAt: new Date() }).where(eq(alerts.id, alertId));
  }
  return true;
}
