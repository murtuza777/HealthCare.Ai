// Alerts: things a patient's caretakers should know about. Raised by fixed rules, never by AI.
// Each alert is stored once and pushed (and emailed, when email is set up) to caretakers who
// have the "alerts" permission.
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type { Db } from "../db/client";
import { alerts, outbox } from "../db/schema";
import { assertAccess, type Actor } from "./authz";
import { alertRecipients } from "./care";
import { queuePush } from "./push";

export type AlertInput = { severity: "info" | "warning" | "critical"; kind: string; title: string; body: string; data?: Record<string, unknown> };

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
  const [alert] = await db.insert(alerts).values({ userId: patientId, source: "rule", ...input }).returning();
  const recipients = await alertRecipients(db, patientId);
  const url = `/app/care/${patientId}`;
  for (const r of recipients) {
    const channels = r.prefs?.channels ?? ["push", "email"];
    const pushed = channels.includes("push") ? await queuePush(db, r.caretakerId, `care:alert`, { title: input.title, body: input.body, url, tag: `alert-${alert!.id}` }) : 0;
    // Email when it's critical, or when the caretaker has no device set up for push.
    if (env.RESEND_API_KEY && channels.includes("email") && (input.severity === "critical" || !pushed)) {
      await db.insert(outbox).values({ channel: "email", recipient: r.email, kind: "care:alert", payload: { title: input.title, body: input.body, url: `${env.APP_URL}${url}` } });
    }
  }
  return alert!;
}

export async function listAlerts(db: Db, actor: Actor, patientId: string, limit = 20) {
  await assertAccess(db, actor, patientId, "alerts");
  return db.select().from(alerts).where(eq(alerts.userId, patientId)).orderBy(desc(alerts.createdAt)).limit(limit);
}

export async function acknowledgeAlert(db: Db, actor: Actor, patientId: string, alertId: string) {
  await assertAccess(db, actor, patientId, "alerts");
  const rows = await db
    .update(alerts)
    .set({ acknowledgedAt: new Date() })
    .where(and(eq(alerts.id, alertId), eq(alerts.userId, patientId), isNull(alerts.acknowledgedAt)))
    .returning({ id: alerts.id });
  return rows.length > 0;
}
