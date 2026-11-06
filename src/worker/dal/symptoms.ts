import { and, desc, eq } from "drizzle-orm";
import { detectRedFlags, type RedFlag } from "../../shared/symptoms";
import type { Db } from "../db/client";
import { symptoms } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Symptom = typeof symptoms.$inferSelect;

type NewSymptom = {
  type: string;
  severity: number;
  durationMin?: number;
  accompaniedBy: string[];
  note?: string;
  occurredAt?: Date;
};

export async function listSymptoms(db: Db, actor: Actor, patientId: string, limit = 50): Promise<Symptom[]> {
  // Symptoms are part of the clinical picture caretakers see with "vitals" access.
  await assertAccess(db, actor, patientId, "vitals");
  return db
    .select()
    .from(symptoms)
    .where(eq(symptoms.userId, patientId))
    .orderBy(desc(symptoms.occurredAt))
    .limit(Math.min(limit, 200));
}

export async function addSymptom(
  db: Db,
  actor: Actor,
  patientId: string,
  input: NewSymptom,
): Promise<{ symptom: Symptom; redFlag: RedFlag }> {
  await assertAccess(db, actor, patientId, "owner");
  const [row] = await db
    .insert(symptoms)
    .values({
      userId: patientId,
      type: input.type,
      severity: input.severity,
      durationMin: input.durationMin ?? null,
      accompaniedBy: input.accompaniedBy,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning();
  return { symptom: row!, redFlag: detectRedFlags(input) };
}

export async function deleteSymptom(db: Db, actor: Actor, patientId: string, id: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  const rows = await db
    .delete(symptoms)
    .where(and(eq(symptoms.id, id), eq(symptoms.userId, patientId)))
    .returning({ id: symptoms.id });
  return rows.length > 0;
}
