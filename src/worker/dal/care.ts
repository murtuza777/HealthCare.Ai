// Caretaker links. A patient invites someone by email; the invite is a random token (only its
// SHA-256 hash is stored) that must be accepted, within 7 days, by an account with that email.
// Access itself is checked in authz.canAccess, which only honours "active" links.
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { INVITE_TTL_MS, type CareInvite, type CarePermissionName } from "../../shared/care";
import type { Db } from "../db/client";
import { careLinks, profiles, user } from "../db/schema";
import { hashToken } from "./shares";
import { assertAccess, type Actor } from "./authz";

export class CareError extends Error {}

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** The patient's caretakers and pending invites. */
export async function listCaretakers(db: Db, actor: Actor) {
  const rows = await db
    .select({ link: careLinks, name: user.name, email: user.email })
    .from(careLinks)
    .leftJoin(user, eq(user.id, careLinks.caretakerId))
    .where(and(eq(careLinks.patientId, actor.userId), ne(careLinks.status, "revoked")))
    .orderBy(desc(careLinks.createdAt));
  const now = Date.now();
  return rows.map(({ link, name, email }) => ({
    id: link.id,
    status: link.status,
    invitedEmail: link.invitedEmail,
    name: name ?? null,
    email: email ?? link.invitedEmail,
    relation: link.alertPrefs ? ((link.alertPrefs as { relation?: string }).relation ?? null) : null,
    permissions: link.permissions,
    createdAt: link.createdAt,
    expired: link.status === "invited" && now - link.createdAt.getTime() > INVITE_TTL_MS,
  }));
}

export async function inviteCaretaker(db: Db, actor: Actor, input: CareInvite) {
  await assertAccess(db, actor, actor.userId, "owner");
  const me = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, actor.userId)).get();
  if (me?.email.toLowerCase() === input.email) throw new CareError("You can't invite yourself.");
  const existing = await db
    .select({ id: careLinks.id, status: careLinks.status })
    .from(careLinks)
    .where(and(eq(careLinks.patientId, actor.userId), eq(careLinks.invitedEmail, input.email), ne(careLinks.status, "revoked")))
    .get();
  if (existing?.status === "active") throw new CareError("This person already has access.");

  const token = randomToken();
  const values = {
    patientId: actor.userId,
    invitedEmail: input.email,
    inviteTokenHash: await hashToken(token),
    status: "invited" as const,
    permissions: input.permissions,
    // The relation ("daughter", "GP") rides along in alert_prefs to avoid a migration.
    alertPrefs: { channels: ["push", "email"], ...(input.relation ? { relation: input.relation } : {}) } as (typeof careLinks.$inferInsert)["alertPrefs"],
  };
  // Re-inviting replaces the old pending invite (and its token).
  const [link] = existing
    ? await db.update(careLinks).set({ ...values, createdAt: new Date(), updatedAt: new Date() }).where(eq(careLinks.id, existing.id)).returning()
    : await db.insert(careLinks).values(values).returning();
  return { link: link!, token, patientName: me?.name ?? "" };
}

/** Accept an invite as the signed-in account. The account's email must match the invite. */
export async function acceptInvite(db: Db, actor: Actor, token: string, now = new Date()) {
  const link = await db
    .select()
    .from(careLinks)
    .where(and(eq(careLinks.inviteTokenHash, await hashToken(token)), eq(careLinks.status, "invited")))
    .get();
  if (!link || now.getTime() - link.createdAt.getTime() > INVITE_TTL_MS) throw new CareError("This invite has expired or was already used. Ask for a new one.");
  if (link.patientId === actor.userId) throw new CareError("This is your own invite. Send the link to the person you want to add.");
  const me = await db.select({ email: user.email }).from(user).where(eq(user.id, actor.userId)).get();
  if (!me || me.email.toLowerCase() !== link.invitedEmail) {
    throw new CareError(`This invite was sent to ${link.invitedEmail}. Sign in with that email to accept it.`);
  }
  const [row] = await db
    .update(careLinks)
    .set({ caretakerId: actor.userId, status: "active", inviteTokenHash: null, updatedAt: now })
    .where(eq(careLinks.id, link.id))
    .returning();
  return row!;
}

/** Details shown before accepting (who invited you, what you'll see). No access is granted. */
export async function previewInvite(db: Db, token: string, now = new Date()) {
  const row = await db
    .select({ link: careLinks, name: user.name })
    .from(careLinks)
    .innerJoin(user, eq(user.id, careLinks.patientId))
    .where(and(eq(careLinks.inviteTokenHash, await hashToken(token)), eq(careLinks.status, "invited")))
    .get();
  if (!row || now.getTime() - row.link.createdAt.getTime() > INVITE_TTL_MS) return null;
  return { patientName: row.name, invitedEmail: row.link.invitedEmail, permissions: row.link.permissions };
}

export async function updateCarePermissions(db: Db, actor: Actor, linkId: string, permissions: CarePermissionName[]) {
  const [row] = await db
    .update(careLinks)
    .set({ permissions, updatedAt: new Date() })
    .where(and(eq(careLinks.id, linkId), eq(careLinks.patientId, actor.userId), ne(careLinks.status, "revoked")))
    .returning();
  return row ?? null;
}

/** Ends access immediately (patients remove caretakers; caretakers can leave). */
export async function revokeCareLink(db: Db, actor: Actor, linkId: string): Promise<boolean> {
  const link = await db.select().from(careLinks).where(eq(careLinks.id, linkId)).get();
  if (!link || (link.patientId !== actor.userId && link.caretakerId !== actor.userId)) return false;
  await db.update(careLinks).set({ status: "revoked", inviteTokenHash: null, updatedAt: new Date() }).where(eq(careLinks.id, linkId));
  return true;
}

/** Patients this account cares for. */
export async function listPatientsCaredFor(db: Db, actor: Actor) {
  const rows = await db
    .select({ link: careLinks, name: user.name, email: user.email, country: profiles.country })
    .from(careLinks)
    .innerJoin(user, eq(user.id, careLinks.patientId))
    .leftJoin(profiles, eq(profiles.userId, careLinks.patientId))
    .where(and(eq(careLinks.caretakerId, actor.userId), eq(careLinks.status, "active")));
  return rows.map(({ link, name, email, country }) => ({ linkId: link.id, patientId: link.patientId, name, email, country, permissions: link.permissions }));
}

/** Active caretakers who asked to be alerted about this patient. */
export async function alertRecipients(db: Db, patientId: string) {
  const rows = await db
    .select({ caretakerId: careLinks.caretakerId, email: user.email, permissions: careLinks.permissions, prefs: careLinks.alertPrefs })
    .from(careLinks)
    .innerJoin(user, eq(user.id, careLinks.caretakerId))
    .where(and(eq(careLinks.patientId, patientId), eq(careLinks.status, "active")));
  return rows.filter((r) => r.permissions.includes("alerts") && r.caretakerId) as { caretakerId: string; email: string; prefs: { channels: ("email" | "push")[] } | null }[];
}

export async function patientNames(db: Db, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}
