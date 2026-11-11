// Sends appointment and custom reminders when their time comes. A reminder that is found long
// after its time (for example after an outage) is closed without a late, confusing notification.
import { whenText } from "../../shared/reminders";
import type { Db } from "../db/client";
import { queuePush } from "../dal/push";
import { markReminderNotified, remindersToNotify } from "../dal/reminders";

const STALE_MS = 3 * 3_600_000;

export async function sendReminders(db: Db, now = new Date()) {
  const due = await remindersToNotify(db, now);
  let sent = 0;
  for (const { reminder, timezone } of due) {
    const late = now.getTime() - (reminder.nextRunAt?.getTime() ?? 0) > STALE_MS || reminder.dueAt.getTime() < now.getTime() - STALE_MS;
    if (!late) {
      const when = whenText(reminder.dueAt, now, timezone || "UTC");
      await queuePush(db, reminder.userId, `reminder:${reminder.kind}`, {
        title: reminder.kind === "appointment" ? `Appointment: ${reminder.title}` : reminder.title,
        body: reminder.kind === "appointment" ? `${when}. Your visit summary is ready to print or show.` : when,
        url: reminder.kind === "appointment" ? "/app/visit" : "/app",
        tag: `reminder-${reminder.id}`,
      });
      sent++;
    }
    await markReminderNotified(db, reminder, now);
  }
  return sent;
}
