// Authorization. D1 has no row-level security, so every data access goes through here.
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { careLinks, type CarePermission } from "../db/schema";

export type Actor = { userId: string };

/**
 * - "owner": only the patient themself (all writes for now).
 * - a CarePermission: the owner, or an active caretaker granted that permission.
 * - "any": the owner, or any active caretaker (basic profile).
 */
export type Need = "owner" | "any" | CarePermission;

export class AccessDenied extends Error {
  constructor() {
    super("Access denied");
    this.name = "AccessDenied";
  }
}

export async function canAccess(db: Db, actor: Actor, patientId: string, need: Need): Promise<boolean> {
  if (actor.userId === patientId) return true;
  if (need === "owner") return false;
  const link = await db
    .select({ permissions: careLinks.permissions })
    .from(careLinks)
    .where(and(eq(careLinks.patientId, patientId), eq(careLinks.caretakerId, actor.userId), eq(careLinks.status, "active")))
    .get();
  if (!link) return false;
  return need === "any" || link.permissions.includes(need);
}

export async function assertAccess(db: Db, actor: Actor, patientId: string, need: Need): Promise<void> {
  if (!(await canAccess(db, actor, patientId, need))) throw new AccessDenied();
}
