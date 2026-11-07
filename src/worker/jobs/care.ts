// Caretaker escalation for missed doses. Filled in with caretaker accounts.
import type { Db } from "../db/client";

export async function onMissedDoses(_env: Env, _db: Db, _missed: { userId: string; medicationId: string; scheduledAt: Date }[], _now: Date) {
  return 0;
}
