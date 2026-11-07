import { and, desc, eq } from "drizzle-orm";
import type { AllowedMime, ReportMeta } from "../../shared/reports";
import type { Db } from "../db/client";
import { reports } from "../db/schema";
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
