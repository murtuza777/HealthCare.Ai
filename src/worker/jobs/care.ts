// Caretaker escalation: when doses are missed, caretakers with the "alerts" permission hear about it.
// Doses missed long ago (e.g. after an outage) are marked but not announced.
import type { Db } from "../db/client";
import { raiseAlert } from "../dal/alerts";
import { patientNames } from "../dal/care";

type Missed = { userId: string; medicationId: string; scheduledAt: Date; name: string; dose: string; timezone: string | null };

const STALE_MS = 6 * 60 * 60 * 1000;

export async function onMissedDoses(env: Env, db: Db, missed: Missed[], now: Date) {
  const fresh = missed.filter((m) => now.getTime() - m.scheduledAt.getTime() < STALE_MS);
  if (!fresh.length) return 0;
  const byPatient = new Map<string, Missed[]>();
  for (const m of fresh) byPatient.set(m.userId, [...(byPatient.get(m.userId) ?? []), m]);
  const names = await patientNames(db, [...byPatient.keys()]);
  for (const [patientId, items] of byPatient) {
    const first = names.get(patientId)?.split(" ")[0] || "Your patient";
    const list = items
      .map((m) => `${m.name} ${m.dose} at ${m.scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: m.timezone || "UTC" })}`)
      .join(", ");
    await raiseAlert(env, db, patientId, {
      severity: "warning",
      kind: "missed-dose",
      title: `${first} missed ${items.length === 1 ? "a dose" : `${items.length} doses`}`,
      body: `Not marked as taken: ${list}.`,
      data: { doses: items.map((m) => ({ medicationId: m.medicationId, scheduledAt: m.scheduledAt.toISOString() })) },
    });
  }
  return byPatient.size;
}
