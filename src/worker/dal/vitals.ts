import { and, desc, eq, lt, type SQL } from "drizzle-orm";
import { CANONICAL_UNITS, classifyVital, type VitalInput, type VitalType } from "../../shared/vitals";
import type { Db } from "../db/client";
import { vitals } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Vital = typeof vitals.$inferSelect;

export async function listVitals(
  db: Db,
  actor: Actor,
  patientId: string,
  opts: { type?: VitalType; limit?: number; before?: Date } = {},
): Promise<Vital[]> {
  await assertAccess(db, actor, patientId, "vitals");
  const where: SQL[] = [eq(vitals.userId, patientId)];
  if (opts.type) where.push(eq(vitals.type, opts.type));
  if (opts.before) where.push(lt(vitals.measuredAt, opts.before));
  return db
    .select()
    .from(vitals)
    .where(and(...where))
    .orderBy(desc(vitals.measuredAt))
    .limit(Math.min(opts.limit ?? 50, 200));
}

export async function addVital(db: Db, actor: Actor, patientId: string, input: VitalInput): Promise<Vital> {
  await assertAccess(db, actor, patientId, "owner");
  const [row] = await db
    .insert(vitals)
    .values({
      userId: patientId,
      type: input.type,
      value: input.value,
      value2: input.value2 ?? null,
      unit: CANONICAL_UNITS[input.type],
      measuredAt: input.measuredAt ?? new Date(),
      classification: classifyVital(input.type, input.value, input.value2),
      note: input.note ?? null,
      source: "manual",
    })
    .returning();
  return row!;
}
