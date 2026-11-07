// The patient's own account: consent records, a full data export, deletion, and the audit log
// of access by anyone other than the patient.
import { desc, eq, inArray, or } from "drizzle-orm";
import { CONSENT_VERSIONS, type ConsentKind } from "../../shared/account";
import type { Db } from "../db/client";
import {
  alerts,
  auditLog,
  careLinks,
  consents,
  conversations,
  doseEvents,
  medications,
  messages,
  profiles,
  reports,
  shares,
  symptoms,
  user,
  vitals,
} from "../db/schema";
import type { Actor } from "./authz";

export async function audit(db: Db, entry: { actorId: string | null; subjectUserId: string; action: string; entity: string; entityId?: string | null }) {
  await db.insert(auditLog).values({ ...entry, entityId: entry.entityId ?? null });
}

/** Access to my record by other people, newest first. */
export async function accessLog(db: Db, actor: Actor, limit = 50) {
  const rows = await db
    .select({ id: auditLog.id, action: auditLog.action, entity: auditLog.entity, at: auditLog.at, actorName: user.name, actorEmail: user.email })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(eq(auditLog.subjectUserId, actor.userId))
    .orderBy(desc(auditLog.at))
    .limit(limit);
  return rows;
}

export async function consentStatus(db: Db, actor: Actor) {
  const rows = await db.select().from(consents).where(eq(consents.userId, actor.userId));
  const has = (kind: ConsentKind) => rows.some((r) => r.kind === kind && r.version === CONSENT_VERSIONS[kind]);
  return { terms: has("terms"), privacy: has("privacy"), ai_processing: has("ai_processing"), versions: CONSENT_VERSIONS };
}

export async function recordConsents(db: Db, actor: Actor, kinds: ConsentKind[]) {
  const current = await consentStatus(db, actor);
  const missing = kinds.filter((k) => !current[k]);
  if (missing.length) await db.insert(consents).values(missing.map((kind) => ({ userId: actor.userId, kind, version: CONSENT_VERSIONS[kind] })));
  return consentStatus(db, actor);
}

/** Everything stored about the account, as plain JSON (report files are listed, downloaded separately). */
export async function exportAccount(db: Db, actor: Actor) {
  const id = actor.userId;
  const convos = await db.select().from(conversations).where(eq(conversations.userId, id));
  const [account, profile, vitalRows, meds, doses, symptomRows, reportRows, shareRows, care, alertRows, consentRows, msgRows] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.id, id)).get(),
    db.select().from(profiles).where(eq(profiles.userId, id)).get(),
    db.select().from(vitals).where(eq(vitals.userId, id)).orderBy(vitals.measuredAt),
    db.select().from(medications).where(eq(medications.userId, id)),
    db.select().from(doseEvents).where(eq(doseEvents.userId, id)).orderBy(doseEvents.scheduledAt),
    db.select().from(symptoms).where(eq(symptoms.userId, id)).orderBy(symptoms.occurredAt),
    db.select().from(reports).where(eq(reports.userId, id)),
    db.select({ id: shares.id, createdAt: shares.createdAt, expiresAt: shares.expiresAt, revokedAt: shares.revokedAt }).from(shares).where(eq(shares.userId, id)),
    db
      .select({ id: careLinks.id, patientId: careLinks.patientId, caretakerId: careLinks.caretakerId, invitedEmail: careLinks.invitedEmail, status: careLinks.status, permissions: careLinks.permissions, createdAt: careLinks.createdAt })
      .from(careLinks)
      .where(or(eq(careLinks.patientId, id), eq(careLinks.caretakerId, id))),
    db.select().from(alerts).where(eq(alerts.userId, id)),
    db.select().from(consents).where(eq(consents.userId, id)),
    convos.length ? db.select().from(messages).where(inArray(messages.conversationId, convos.map((c) => c.id))) : Promise.resolve([]),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    format: "healthcare-ai-export/1",
    account,
    profile: profile ?? null,
    vitals: vitalRows,
    medications: meds,
    doseEvents: doses,
    symptoms: symptomRows,
    reports: reportRows.map(({ r2Key: _key, ...r }) => ({ ...r, file: `/api/v1/patients/me/reports/${r.id}/file?download=1` })),
    shareLinks: shareRows,
    careTeam: care,
    alerts: alertRows,
    consents: consentRows,
    assistant: convos.map((c) => ({ ...c, messages: msgRows.filter((m) => m.conversationId === c.id).map(({ role, content, createdAt, rating }) => ({ role, content, createdAt, rating })) })),
  };
}

/** Delete the account, every row that belongs to it (by cascade) and every stored report file. */
export async function deleteAccount(db: Db, bucket: R2Bucket, actor: Actor) {
  const keys = (await db.select({ key: reports.r2Key }).from(reports).where(eq(reports.userId, actor.userId))).map((r) => r.key);
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
  // Caretaker links where this account is the caretaker are removed by the cascade as well.
  await db.delete(user).where(eq(user.id, actor.userId));
  // Keep a minimal, data-free trace that a deletion happened (no name, email or health data).
  await audit(db, { actorId: null, subjectUserId: actor.userId, action: "account.deleted", entity: "user" });
  return { filesDeleted: keys.length };
}

