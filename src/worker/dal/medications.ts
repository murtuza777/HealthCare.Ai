import { and, desc, eq } from "drizzle-orm";
import type { MedicationInput } from "../../shared/medications";
import type { Db } from "../db/client";
import { medications } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Medication = typeof medications.$inferSelect;

export async function listMedications(db: Db, actor: Actor, patientId: string, opts: { includeInactive?: boolean } = {}) {
  await assertAccess(db, actor, patientId, "meds");
  const where = opts.includeInactive
    ? eq(medications.userId, patientId)
    : and(eq(medications.userId, patientId), eq(medications.active, true));
  return db.select().from(medications).where(where).orderBy(desc(medications.active), medications.name);
}

export async function addMedication(db: Db, actor: Actor, patientId: string, input: MedicationInput): Promise<Medication> {
  await assertAccess(db, actor, patientId, "owner");
  const [row] = await db
    .insert(medications)
    .values({
      userId: patientId,
      name: input.name,
      dose: input.dose,
      form: input.form ?? null,
      instructions: input.instructions ?? null,
      schedule: input.schedule,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
    })
    .returning();
  return row!;
}

/** Scoped by patient as well as id, so an id from another account never matches. */
export async function setMedicationActive(db: Db, actor: Actor, patientId: string, id: string, active: boolean) {
  await assertAccess(db, actor, patientId, "owner");
  const [row] = await db
    .update(medications)
    .set({ active })
    .where(and(eq(medications.id, id), eq(medications.userId, patientId)))
    .returning();
  return row ?? null;
}

export async function deleteMedication(db: Db, actor: Actor, patientId: string, id: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  const rows = await db
    .delete(medications)
    .where(and(eq(medications.id, id), eq(medications.userId, patientId)))
    .returning({ id: medications.id });
  return rows.length > 0;
}
