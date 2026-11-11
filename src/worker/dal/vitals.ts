import { and, desc, eq, lt, type SQL, gte, lte } from "drizzle-orm";
import { CANONICAL_UNITS, classifyVital, VITAL_TYPES, type VitalInput, type VitalType } from "../../shared/vitals";
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

/** Most recent reading of each type (one small indexed query per type, sent as one batch). */
export async function latestVitals(db: Db, actor: Actor, patientId: string): Promise<Partial<Record<VitalType, Vital>>> {
  await assertAccess(db, actor, patientId, "vitals");
  return latestVitalsFor(db, patientId);
}

/**
 * No access check: callers must already have authorized access to this patient's vitals
 * (latestVitals above, or a valid share link that includes vitals).
 */
export async function latestVitalsFor(db: Db, patientId: string): Promise<Partial<Record<VitalType, Vital>>> {
  const queries = VITAL_TYPES.map((type) =>
    db
      .select()
      .from(vitals)
      .where(and(eq(vitals.userId, patientId), eq(vitals.type, type)))
      .orderBy(desc(vitals.measuredAt))
      .limit(1),
  );
  const results = await db.batch(queries as unknown as [(typeof queries)[number], ...(typeof queries)[number][]]);
  const out: Partial<Record<VitalType, Vital>> = {};
  results.forEach((rows, i) => {
    if (rows[0]) out[VITAL_TYPES[i]!] = rows[0];
  });
  return out;
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

export async function deleteVital(db: Db, actor: Actor, patientId: string, id: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  const rows = await db
    .delete(vitals)
    .where(and(eq(vitals.id, id), eq(vitals.userId, patientId)))
    .returning({ id: vitals.id });
  return rows.length > 0;
}

/**
 * Add readings from a file. Readings already in the record (same type, time and values) are
 * left alone, so importing the same file twice is harmless. Old readings never raise alerts.
 */
export async function importVitals(db: Db, actor: Actor, patientId: string, items: VitalInput[]): Promise<{ added: number; duplicates: number }> {
  await assertAccess(db, actor, patientId, "owner");
  const now = new Date();
  const key = (v: { type: string; value: number; value2?: number | null; measuredAt: Date }) => `${v.type}|${v.measuredAt.getTime()}|${v.value}|${v.value2 ?? ""}`;
  const times = items.map((i) => (i.measuredAt ?? now).getTime());
  const existing = await db
    .select({ type: vitals.type, value: vitals.value, value2: vitals.value2, measuredAt: vitals.measuredAt })
    .from(vitals)
    .where(and(eq(vitals.userId, patientId), gte(vitals.measuredAt, new Date(Math.min(...times))), lte(vitals.measuredAt, new Date(Math.max(...times)))));
  const seen = new Set(existing.map(key));
  const fresh = [];
  for (const i of items) {
    const row = { ...i, measuredAt: i.measuredAt ?? now };
    if (seen.has(key(row))) continue;
    seen.add(key(row));
    fresh.push({
      userId: patientId,
      type: row.type,
      value: row.value,
      value2: row.value2 ?? null,
      unit: CANONICAL_UNITS[row.type],
      measuredAt: row.measuredAt,
      classification: classifyVital(row.type, row.value, row.value2),
      note: row.note ?? null,
      source: "import" as const,
    });
  }
  // D1 allows 100 bound values per statement; each row binds 10.
  for (let n = 0; n < fresh.length; n += 9) await db.insert(vitals).values(fresh.slice(n, n + 9));
  return { added: fresh.length, duplicates: items.length - fresh.length };
}
