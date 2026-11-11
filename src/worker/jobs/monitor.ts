// Daily review of each patient's record for slow changes (rising blood pressure, missed doses,
// sudden weight gain, no readings). Rules live in src/shared/insights.ts; nothing here uses AI.
// Each finding is stored as an alert: the patient sees it on their overview and gets a push,
// and caretakers with the "alerts" permission are told too. The same finding isn't repeated
// for six days.
import { findInsights } from "../../shared/insights";
import type { Db } from "../db/client";
import { raiseAlert } from "../dal/alerts";
import { patientNames } from "../dal/care";
import { insightInputFor, patientsDueForReview } from "../dal/monitor";
import { queuePush } from "../dal/push";

const REPEAT_AFTER_MS = 6 * 24 * 60 * 60 * 1000;

export async function reviewPatient(env: Pick<Env, "APP_URL" | "RESEND_API_KEY">, db: Db, patientId: string, now: Date) {
  const insights = findInsights(await insightInputFor(db, patientId, now));
  if (!insights.length) return 0;
  const first = (await patientNames(db, [patientId])).get(patientId)?.split(" ")[0] || "Your patient";
  let raised = 0;
  for (const i of insights) {
    const alert = await raiseAlert(
      env,
      db,
      patientId,
      { severity: i.severity, kind: i.kind, title: i.title, body: i.body, notifyTitle: `${first}: ${i.title.charAt(0).toLowerCase()}${i.title.slice(1)}` },
      REPEAT_AFTER_MS,
      now,
    );
    if (!alert) continue;
    raised++;
    await queuePush(db, patientId, "insight", { title: i.title, body: i.body, url: "/app", tag: i.kind });
  }
  return raised;
}

export async function runDailyReview(env: Pick<Env, "APP_URL" | "RESEND_API_KEY">, db: Db, now: Date) {
  const due = await patientsDueForReview(db, now);
  let raised = 0;
  for (const p of due) raised += await reviewPatient(env, db, p.userId, now);
  return raised;
}
