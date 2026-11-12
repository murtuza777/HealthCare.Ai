// One feed of everything in a patient's record, newest first: readings, symptoms, doses,
// reports and alerts. A caretaker sees only the kinds their permissions cover.
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { detectRedFlags } from "../../shared/symptoms";
import { TIMELINE_KINDS, type TimelineItem, type TimelineKind } from "../../shared/timeline";
import type { Db } from "../db/client";
import { alerts, doseEvents, medications, reports, symptoms, vitals } from "../db/schema";
import { assertAccess, canAccess, type Actor, type Need } from "./authz";

const NEEDS: Record<TimelineKind, Need> = { vital: "vitals", symptom: "vitals", dose: "meds", report: "reports", alert: "alerts" };

export async function timeline(
  db: Db,
  actor: Actor,
  patientId: string,
  opts: { before?: Date; limit?: number; kinds?: TimelineKind[] } = {},
): Promise<{ items: TimelineItem[]; next: Date | null }> {
  await assertAccess(db, actor, patientId, "any");
  const limit = Math.min(opts.limit ?? 40, 100);
  // Each source is read a little past the page so entries sharing the last timestamp
  // (a blood pressure and pulse taken together) are never split across two pages.
  const fetch = limit + 20;
  const before = opts.before ?? new Date(Date.now() + 60_000);
  const wanted = opts.kinds?.length ? opts.kinds : [...TIMELINE_KINDS];
  const allowed = new Set<TimelineKind>();
  for (const k of wanted) if (await canAccess(db, actor, patientId, NEEDS[k])) allowed.add(k);

  const [v, s, d, r, a] = await Promise.all([
    allowed.has("vital")
      ? db.select().from(vitals).where(and(eq(vitals.userId, patientId), lt(vitals.measuredAt, before))).orderBy(desc(vitals.measuredAt)).limit(fetch)
      : [],
    allowed.has("symptom")
      ? db.select().from(symptoms).where(and(eq(symptoms.userId, patientId), lt(symptoms.occurredAt, before))).orderBy(desc(symptoms.occurredAt)).limit(fetch)
      : [],
    allowed.has("dose")
      ? db
          .select({ id: doseEvents.id, status: doseEvents.status, scheduledAt: doseEvents.scheduledAt, actedAt: doseEvents.actedAt, name: medications.name, dose: medications.dose })
          .from(doseEvents)
          .innerJoin(medications, eq(medications.id, doseEvents.medicationId))
          .where(and(eq(doseEvents.userId, patientId), inArray(doseEvents.status, ["taken", "skipped", "missed"]), lt(doseEvents.scheduledAt, before)))
          .orderBy(desc(doseEvents.scheduledAt))
          .limit(fetch)
      : [],
    allowed.has("report")
      ? db.select().from(reports).where(and(eq(reports.userId, patientId), lt(reports.createdAt, before))).orderBy(desc(reports.createdAt)).limit(fetch)
      : [],
    allowed.has("alert")
      ? db.select().from(alerts).where(and(eq(alerts.userId, patientId), lt(alerts.createdAt, before))).orderBy(desc(alerts.createdAt)).limit(fetch)
      : [],
  ]);

  const all: TimelineItem[] = [
    ...v.map((x): TimelineItem => ({
      id: `vital:${x.id}`,
      kind: "vital",
      at: x.measuredAt,
      title: x.type,
      detail: x.type === "blood_pressure" ? `${x.value}/${x.value2} ${x.unit}` : `${x.value} ${x.unit}`,
      note: x.note,
      status: x.classification,
      tone: x.classification === "critical" ? "critical" : x.classification === "high" || x.classification === "low" ? "attention" : "normal",
    })),
    ...s.map((x): TimelineItem => {
      const urgent = detectRedFlags({ type: x.type, severity: x.severity, accompaniedBy: x.accompaniedBy }).emergency;
      return {
        id: `symptom:${x.id}`,
        kind: "symptom",
        at: x.occurredAt,
        title: x.type,
        detail: `Severity ${x.severity}/10${x.accompaniedBy.length ? `, with ${x.accompaniedBy.join(", ")}` : ""}`,
        note: x.note,
        status: null,
        tone: urgent ? "critical" : x.severity >= 7 ? "attention" : "normal",
      };
    }),
    ...d.map((x): TimelineItem => ({
      id: `dose:${x.id}`,
      kind: "dose",
      at: x.scheduledAt,
      title: `${x.name} ${x.dose}`,
      detail: x.status,
      note: null,
      status: null,
      tone: x.status === "missed" ? "attention" : "normal",
    })),
    ...r.map((x): TimelineItem => ({ id: `report:${x.id}`, kind: "report", at: x.createdAt, title: x.title, detail: x.type, note: x.summary, status: null, tone: "normal" })),
    ...a.map((x): TimelineItem => ({
      id: `alert:${x.id}`,
      kind: "alert",
      at: x.createdAt,
      title: x.title,
      detail: x.body,
      note: null,
      status: null,
      tone: x.severity === "critical" ? "critical" : x.severity === "warning" ? "attention" : "normal",
    })),
  ].sort((x, y) => +y.at - +x.at);

  let cut = Math.min(limit, all.length);
  while (cut < all.length && +all[cut]!.at === +all[cut - 1]!.at) cut++;
  const items = all.slice(0, cut);
  // More to show if anything was left over, or a source filled what was read from it.
  const more = all.length > cut || [v, s, d, r, a].some((rows) => rows.length === fetch);
  return { items, next: more && items.length ? items[items.length - 1]!.at : null };
}
