import { and, desc, eq, inArray } from "drizzle-orm";
import { flagFinding, type FindingInput } from "../../shared/findings";
import type { AllowedMime, ReportMeta } from "../../shared/reports";
import type { Db } from "../db/client";
import { reportFindings, reports } from "../db/schema";
import { assertAccess, type Actor } from "./authz";

export type Report = typeof reports.$inferSelect;

const objectKey = (patientId: string, reportId: string) => `users/${patientId}/reports/${reportId}`;

export async function listReports(db: Db, actor: Actor, patientId: string): Promise<Report[]> {
  await assertAccess(db, actor, patientId, "reports");
  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, patientId))
    .orderBy(desc(reports.reportDate), desc(reports.createdAt))
    .limit(500);
}

export async function getReport(db: Db, actor: Actor, patientId: string, reportId: string): Promise<Report | null> {
  await assertAccess(db, actor, patientId, "reports");
  const row = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, patientId)))
    .get();
  return row ?? null;
}

export async function createReport(
  db: Db,
  bucket: R2Bucket,
  actor: Actor,
  patientId: string,
  meta: ReportMeta,
  file: { bytes: ArrayBuffer; mime: AllowedMime },
): Promise<Report> {
  await assertAccess(db, actor, patientId, "owner");
  const id = crypto.randomUUID();
  const key = objectKey(patientId, id);
  await bucket.put(key, file.bytes, { httpMetadata: { contentType: file.mime } });
  try {
    const [row] = await db
      .insert(reports)
      .values({
        id,
        userId: patientId,
        title: meta.title,
        type: meta.type,
        reportDate: meta.reportDate ?? null,
        doctor: meta.doctor ?? null,
        facility: meta.facility ?? null,
        note: meta.note ?? null,
        r2Key: key,
        mime: file.mime,
        size: file.bytes.byteLength,
      })
      .returning();
    return row!;
  } catch (err) {
    await bucket.delete(key); // don't leave an orphaned file behind
    throw err;
  }
}

export async function deleteReport(db: Db, bucket: R2Bucket, actor: Actor, patientId: string, reportId: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  const [row] = await db
    .delete(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, patientId)))
    .returning({ r2Key: reports.r2Key });
  if (!row) return false;
  await bucket.delete(row.r2Key);
  return true;
}

// --- Values read from a report -----------------------------------------------

export type Finding = typeof reportFindings.$inferSelect;

/** Only the owner can ask for their report to be read by the AI model. */
export async function beginExtraction(db: Db, actor: Actor, patientId: string, reportId: string): Promise<Report | null> {
  await assertAccess(db, actor, patientId, "owner");
  const [row] = await db
    .update(reports)
    .set({ extractionStatus: "pending" })
    .where(and(eq(reports.id, reportId), eq(reports.userId, patientId)))
    .returning();
  return row ?? null;
}

export async function failExtraction(db: Db, reportId: string) {
  await db.update(reports).set({ extractionStatus: "failed" }).where(eq(reports.id, reportId));
}

/** Store what was read. Values the patient has already corrected are kept as they are. */
export async function saveExtraction(db: Db, reportId: string, result: { summary: string | null; findings: FindingInput[] }): Promise<Finding[]> {
  const kept = await db.select().from(reportFindings).where(and(eq(reportFindings.reportId, reportId), eq(reportFindings.confirmedByUser, true)));
  await db.delete(reportFindings).where(and(eq(reportFindings.reportId, reportId), eq(reportFindings.confirmedByUser, false)));
  const keptTests = new Set(kept.map((k) => k.test.toLowerCase()));
  const fresh = result.findings.filter((f) => !keptTests.has(f.test.toLowerCase()));
  // D1 limits bound parameters per statement, so insert in small batches.
  for (let i = 0; i < fresh.length; i += 10) {
    await db.insert(reportFindings).values(fresh.slice(i, i + 10).map((f) => ({ reportId, ...f, flag: flagFinding(f.value, f.refLow, f.refHigh) })));
  }
  await db.update(reports).set({ extractionStatus: "done", summary: result.summary }).where(eq(reports.id, reportId));
  return db.select().from(reportFindings).where(eq(reportFindings.reportId, reportId));
}

export async function listFindings(db: Db, actor: Actor, patientId: string, reportId: string): Promise<Finding[] | null> {
  const report = await getReport(db, actor, patientId, reportId);
  if (!report) return null;
  return db.select().from(reportFindings).where(eq(reportFindings.reportId, reportId));
}

async function ownFinding(db: Db, patientId: string, findingId: string) {
  return db
    .select({ id: reportFindings.id })
    .from(reportFindings)
    .innerJoin(reports, eq(reports.id, reportFindings.reportId))
    .where(and(eq(reportFindings.id, findingId), eq(reports.userId, patientId)))
    .get();
}

/** The patient corrects a value; it is then marked as checked by them. */
export async function updateFinding(db: Db, actor: Actor, patientId: string, findingId: string, input: FindingInput): Promise<Finding | null> {
  await assertAccess(db, actor, patientId, "owner");
  if (!(await ownFinding(db, patientId, findingId))) return null;
  const [row] = await db
    .update(reportFindings)
    .set({ ...input, flag: flagFinding(input.value, input.refLow, input.refHigh), confirmedByUser: true })
    .where(eq(reportFindings.id, findingId))
    .returning();
  return row ?? null;
}

export async function deleteFinding(db: Db, actor: Actor, patientId: string, findingId: string): Promise<boolean> {
  await assertAccess(db, actor, patientId, "owner");
  if (!(await ownFinding(db, patientId, findingId))) return false;
  await db.delete(reportFindings).where(eq(reportFindings.id, findingId));
  return true;
}

/** Results outside their printed range, newest reports first (for the assistant and the visit summary). */
export async function outOfRangeFindings(db: Db, actor: Actor, patientId: string, limit = 20) {
  await assertAccess(db, actor, patientId, "reports");
  return db
    .select({
      test: reportFindings.test,
      value: reportFindings.value,
      unit: reportFindings.unit,
      refLow: reportFindings.refLow,
      refHigh: reportFindings.refHigh,
      flag: reportFindings.flag,
      report: reports.title,
      reportDate: reports.reportDate,
    })
    .from(reportFindings)
    .innerJoin(reports, eq(reports.id, reportFindings.reportId))
    .where(and(eq(reports.userId, patientId), inArray(reportFindings.flag, ["low", "high"])))
    .orderBy(desc(reports.reportDate), desc(reports.createdAt))
    .limit(limit);
}
