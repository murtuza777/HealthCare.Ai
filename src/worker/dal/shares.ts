// Time-limited, revocable share links for reports (PRD R-3..R-5).
// The raw token exists only in the link/QR; the database stores its SHA-256 hash.
import { and, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { SHARE_DURATIONS, type ShareInput } from "../../shared/reports";
import type { Db } from "../db/client";
import { reports, shareAccessLog, shareItems, shares, user } from "../db/schema";
import { assertAccess, type Actor } from "./authz";
import { latestVitalsFor } from "./vitals";

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function hashToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

export class ShareError extends Error {}

export async function createShare(db: Db, actor: Actor, patientId: string, input: Required<ShareInput>, now = new Date()) {
  await assertAccess(db, actor, patientId, "owner");
  const ids = [...new Set(input.reportIds)];
  const owned = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.userId, patientId), inArray(reports.id, ids)));
  if (owned.length !== ids.length) throw new ShareError("One or more reports were not found.");

  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(now.getTime() + SHARE_DURATIONS[input.expiresIn] * 1000);
  const [share] = await db
    .insert(shares)
    .values({ userId: patientId, tokenHash: await hashToken(token), expiresAt, includeVitals: input.includeVitals })
    .returning();
  await db.insert(shareItems).values(ids.map((reportId) => ({ shareId: share!.id, reportId })));
  return { share: share!, token };
}

export async function listShares(db: Db, actor: Actor, patientId: string, now = new Date()) {
  await assertAccess(db, actor, patientId, "owner");
  const rows = await db.select().from(shares).where(eq(shares.userId, patientId)).orderBy(desc(shares.createdAt)).limit(100);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [items, opens] = await db.batch([
    db.select({ shareId: shareItems.shareId, reportId: shareItems.reportId, title: reports.title })
      .from(shareItems)
      .innerJoin(reports, eq(reports.id, shareItems.reportId))
      .where(inArray(shareItems.shareId, ids)),
    db.select({ shareId: shareAccessLog.shareId, n: count() }).from(shareAccessLog).where(inArray(shareAccessLog.shareId, ids)).groupBy(shareAccessLog.shareId),
  ]);
  return rows.map(({ tokenHash: _omit, ...s }) => ({
    ...s,
    active: !s.revokedAt && s.expiresAt > now,
    reports: items.filter((i) => i.shareId === s.id).map((i) => ({ id: i.reportId, title: i.title })),
    opens: opens.find((o) => o.shareId === s.id)?.n ?? 0,
  }));
}

export async function revokeShare(db: Db, actor: Actor, patientId: string, shareId: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  const rows = await db
    .update(shares)
    .set({ revokedAt: new Date() })
    .where(and(eq(shares.id, shareId), eq(shares.userId, patientId), isNull(shares.revokedAt)))
    .returning({ id: shares.id });
  return rows.length > 0;
}

// --- Public access by token (no account) -------------------------------------

/** Returns the share if the token is valid, not expired and not revoked; otherwise null. */
async function activeShare(db: Db, token: string, now: Date) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null; // 32 bytes base64url; skip the DB for junk
  return (
    (await db
      .select()
      .from(shares)
      .where(and(eq(shares.tokenHash, await hashToken(token)), isNull(shares.revokedAt), gt(shares.expiresAt, now)))
      .get()) ?? null
  );
}

/** What a recipient (e.g. a doctor) sees. Only metadata of the shared reports, never other data. */
export async function viewShare(db: Db, token: string, visitor: { ipHash: string | null; userAgent: string | null }, now = new Date()) {
  const share = await activeShare(db, token, now);
  if (!share) return null;
  const [owner, shared] = await db.batch([
    db.select({ name: user.name }).from(user).where(eq(user.id, share.userId)),
    db.select({ id: reports.id, title: reports.title, type: reports.type, reportDate: reports.reportDate, doctor: reports.doctor, facility: reports.facility, mime: reports.mime, size: reports.size })
      .from(shareItems)
      .innerJoin(reports, eq(reports.id, shareItems.reportId))
      .where(eq(shareItems.shareId, share.id))
      .orderBy(desc(reports.reportDate)),
  ]);
  await db.insert(shareAccessLog).values({ shareId: share.id, ipHash: visitor.ipHash, userAgent: visitor.userAgent?.slice(0, 200) ?? null });

  let vitals = null;
  if (share.includeVitals) {
    const latest = await latestVitalsFor(db, share.userId);
    vitals = Object.values(latest).map((v) => ({ type: v.type, value: v.value, value2: v.value2, unit: v.unit, measuredAt: v.measuredAt, classification: v.classification }));
  }
  return { patientName: owner[0]?.name ?? "Patient", expiresAt: share.expiresAt, reports: shared, vitals };
}

/** A report file reachable through a valid share token, or null. */
export async function sharedReport(db: Db, token: string, reportId: string, now = new Date()) {
  const share = await activeShare(db, token, now);
  if (!share) return null;
  const row = await db
    .select({ r2Key: reports.r2Key, mime: reports.mime, title: reports.title })
    .from(shareItems)
    .innerJoin(reports, eq(reports.id, shareItems.reportId))
    .where(and(eq(shareItems.shareId, share.id), eq(shareItems.reportId, reportId)))
    .get();
  return row ?? null;
}
