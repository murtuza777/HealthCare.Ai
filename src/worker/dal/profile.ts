import { eq } from "drizzle-orm";
import type { ProfileInput } from "../../shared/profile";
import type { Db } from "../db/client";
import { profiles, user } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Profile = typeof profiles.$inferSelect & { name: string; email: string };

export async function getProfile(db: Db, actor: Actor, patientId: string): Promise<Profile | null> {
  await assertAccess(db, actor, patientId, "any");
  const u = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, patientId)).get();
  if (!u) return null;
  const p = await db.select().from(profiles).where(eq(profiles.userId, patientId)).get();
  return p ? { ...p, ...u } : null;
}

export async function upsertProfile(db: Db, actor: Actor, patientId: string, input: ProfileInput & { name?: string }) {
  await assertAccess(db, actor, patientId, "owner");
  const { name, ...fields } = input;
  if (name) await db.update(user).set({ name }).where(eq(user.id, patientId));
  await db
    .insert(profiles)
    .values({ userId: patientId, ...fields })
    .onConflictDoUpdate({ target: profiles.userId, set: { ...fields, updatedAt: new Date() } });
  return getProfile(db, actor, patientId);
}
