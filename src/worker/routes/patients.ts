// /api/v1/patients/:patientId/...  (":patientId" may be "me")
// Caretaker access to another patient is decided by the DAL, not here.
import { Hono, type Context } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { profileInputSchema } from "../../shared/profile";
import { VITAL_TYPES, vitalInputSchema, type VitalType } from "../../shared/vitals";
import { medicationInputSchema, medicationUpdateSchema } from "../../shared/medications";
import { symptomInputSchema } from "../../shared/symptoms";
import { addMedication, deleteMedication, listMedications, setMedicationActive } from "../dal/medications";
import { getProfile, upsertProfile } from "../dal/profile";
import { beginExtraction, createReport, deleteFinding, deleteReport, failExtraction, getReport, listFindings, listReports, outOfRangeFindings, saveExtraction, updateFinding } from "../dal/reports";
import { findingSchema } from "../../shared/findings";
import { readReport } from "../ai/reader";
import { aiAvailable } from "../ai/model";
import { addTokens, refundQuota, takeQuota } from "../dal/assistant";
import { consentStatus } from "../dal/account";
import { createShare, listShares, revokeShare } from "../dal/shares";
import { shareInputSchema } from "../../shared/reports";
import { fileResponse, readUpload } from "./files";
import { addSymptom, deleteSymptom, listSymptoms } from "../dal/symptoms";
import { addVital, deleteVital, latestVitals, listVitals } from "../dal/vitals";
import { adherence, dosesForDay, markDose } from "../dal/doses";
import { acknowledgeAlert, listAlerts, raiseAlert } from "../dal/alerts";
import { patientNames } from "../dal/care";
import { audit } from "../dal/account";
import { timeline } from "../dal/timeline";
import { TIMELINE_KINDS } from "../../shared/timeline";
import { doseActionSchema } from "../../shared/doses";
import { notFound, parse } from "../middleware/validate";
import type { AppEnv } from "../types";

const listQuery = z.object({
  type: z.enum(VITAL_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
});
const profileBody = profileInputSchema.and(z.object({ name: z.string().trim().min(1).max(100).optional() }));

const patientId = (c: Context<AppEnv>) => {
  const id = c.req.param("patientId");
  return !id || id === "me" ? c.var.actor.userId : id;
};

const VITAL_NAMES: Record<VitalType, string> = {
  blood_pressure: "Blood pressure",
  heart_rate: "Heart rate",
  spo2: "Oxygen",
  weight: "Weight",
  glucose: "Blood glucose",
  temperature: "Temperature",
  cholesterol: "Cholesterol",
};
const firstName = async (c: Context<AppEnv>, id: string) => (await patientNames(c.var.db, [id])).get(id)?.split(" ")[0] || "Your patient";

export const patients = new Hono<AppEnv>()
  // Log every successful read of a record by someone other than its owner (shown to the patient).
  .use("/:patientId/*", async (c, next) => {
    await next();
    const id = patientId(c);
    if (id !== c.var.actor.userId && c.res.ok && c.req.method === "GET") {
      const entity = c.req.path.split("/").slice(5).join("/") || "record";
      await audit(c.var.db, { actorId: c.var.actor.userId, subjectUserId: id, action: "caretaker.viewed", entity });
    }
  })
  .get("/:patientId/profile", async (c) => {
    const profile = await getProfile(c.var.db, c.var.actor, patientId(c));
    return c.json({ profile });
  })
  .put(
    "/:patientId/profile",
    validator("json", (v) => parse(profileBody, v)),
    async (c) => {
      const profile = await upsertProfile(c.var.db, c.var.actor, patientId(c), c.req.valid("json"));
      return c.json({ profile });
    },
  )
  .get(
    "/:patientId/vitals",
    validator("query", (v) => parse(listQuery, v)),
    async (c) => {
      const items = await listVitals(c.var.db, c.var.actor, patientId(c), c.req.valid("query"));
      return c.json({ items });
    },
  )
  .post(
    "/:patientId/vitals",
    validator("json", (v) => parse(vitalInputSchema, v)),
    async (c) => {
      const vital = await addVital(c.var.db, c.var.actor, patientId(c), c.req.valid("json"));
      if (vital.classification === "critical") {
        const who = await firstName(c, vital.userId);
        const reading = vital.type === "blood_pressure" ? `${vital.value}/${vital.value2}` : String(vital.value);
        await raiseAlert(c.env, c.var.db, vital.userId, {
          severity: "critical",
          kind: "critical-reading",
          title: `${who} logged an emergency-range reading`,
          body: `${VITAL_NAMES[vital.type as VitalType]} ${reading} ${vital.unit}. Check on them now.`,
          data: { vitalId: vital.id },
        });
      }
      return c.json({ vital }, 201);
    },
  )
  .delete("/:patientId/vitals/:id", async (c) => {
    if (!(await deleteVital(c.var.db, c.var.actor, patientId(c), c.req.param("id")))) notFound();
    return c.json({ ok: true });
  })
  .get("/:patientId/vitals/latest", async (c) => {
    const latest = await latestVitals(c.var.db, c.var.actor, patientId(c));
    return c.json({ latest });
  })
  // Medications
  .get(
    "/:patientId/medications",
    validator("query", (v) => parse(z.object({ all: z.enum(["1", "0"]).optional() }), v)),
    async (c) => {
      const items = await listMedications(c.var.db, c.var.actor, patientId(c), { includeInactive: c.req.valid("query").all === "1" });
      return c.json({ items });
    },
  )
  .post(
    "/:patientId/medications",
    validator("json", (v) => parse(medicationInputSchema, v)),
    async (c) => {
      const medication = await addMedication(c.var.db, c.var.actor, patientId(c), c.req.valid("json"));
      return c.json({ medication }, 201);
    },
  )
  .patch(
    "/:patientId/medications/:id",
    validator("json", (v) => parse(medicationUpdateSchema, v)),
    async (c) => {
      const medication = await setMedicationActive(c.var.db, c.var.actor, patientId(c), c.req.param("id"), c.req.valid("json").active);
      return c.json({ medication: medication ?? notFound() });
    },
  )
  .delete("/:patientId/medications/:id", async (c) => {
    const deleted = await deleteMedication(c.var.db, c.var.actor, patientId(c), c.req.param("id"));
    if (!deleted) notFound();
    return c.json({ ok: true });
  })
  // Doses and adherence
  .get(
    "/:patientId/doses",
    validator("query", (v) => parse(z.object({ date: z.iso.date().optional() }), v)),
    async (c) => {
      const day = await dosesForDay(c.var.db, c.var.actor, patientId(c), { date: c.req.valid("query").date });
      return c.json(day);
    },
  )
  .post(
    "/:patientId/doses",
    validator("json", (v) => parse(doseActionSchema, v)),
    async (c) => {
      const event = (await markDose(c.var.db, c.var.actor, patientId(c), c.req.valid("json"))) ?? notFound();
      return c.json({ status: event.status, actedAt: event.actedAt });
    },
  )
  .get(
    "/:patientId/adherence",
    validator("query", (v) => parse(z.object({ days: z.coerce.number().int().min(1).max(90).optional() }), v)),
    async (c) => {
      const result = await adherence(c.var.db, c.var.actor, patientId(c), c.req.valid("query").days ?? 7);
      return c.json(result);
    },
  )
  .get("/:patientId/alerts", async (c) => {
    const items = await listAlerts(c.var.db, c.var.actor, patientId(c));
    return c.json({ items });
  })
  .post("/:patientId/alerts/:alertId/ack", async (c) => {
    if (!(await acknowledgeAlert(c.var.db, c.var.actor, patientId(c), c.req.param("alertId")))) notFound();
    return c.json({ ok: true });
  })
  // Everything in one feed
  .get(
    "/:patientId/timeline",
    validator("query", (v) => parse(z.object({ before: z.iso.datetime().optional(), kinds: z.string().max(60).optional() }), v)),
    async (c) => {
      const q = c.req.valid("query");
      const kinds = q.kinds?.split(",").filter((k): k is (typeof TIMELINE_KINDS)[number] => (TIMELINE_KINDS as readonly string[]).includes(k));
      return c.json(await timeline(c.var.db, c.var.actor, patientId(c), { before: q.before ? new Date(q.before) : undefined, kinds }));
    },
  )
  // Symptoms
  .get("/:patientId/symptoms", async (c) => {
    const items = await listSymptoms(c.var.db, c.var.actor, patientId(c));
    return c.json({ items });
  })
  .post(
    "/:patientId/symptoms",
    validator("json", (v) => parse(symptomInputSchema, v)),
    async (c) => {
      const result = await addSymptom(c.var.db, c.var.actor, patientId(c), c.req.valid("json"));
      if (result.redFlag.emergency) {
        const who = await firstName(c, result.symptom.userId);
        await raiseAlert(c.env, c.var.db, result.symptom.userId, {
          severity: "critical",
          kind: "red-flag-symptom",
          title: `${who} reported symptoms that can be an emergency`,
          body: `${result.redFlag.reason} Check on them now.`,
          data: { symptomId: result.symptom.id },
        });
      }
      return c.json(result, 201);
    },
  )
  // Reports
  .get("/:patientId/reports", async (c) => {
    const items = await listReports(c.var.db, c.var.actor, patientId(c));
    return c.json({ items: items.map(({ r2Key: _key, ...r }) => r) });
  })
  .post("/:patientId/reports", async (c) => {
    // Raw file body + X-Report-Meta header (see routes/files.ts); uploaded with plain fetch.
    const { meta, bytes, mime } = await readUpload(c.req.raw);
    const { r2Key: _key, ...report } = await createReport(c.var.db, c.env.REPORTS, c.var.actor, patientId(c), meta, { bytes, mime });
    return c.json({ report }, 201);
  })
  .get("/:patientId/reports/:id/file", async (c) => {
    const report = (await getReport(c.var.db, c.var.actor, patientId(c), c.req.param("id"))) ?? notFound();
    return fileResponse(c.env.REPORTS, report.r2Key, report.mime, report.title, c.req.query("download") === "1");
  })
  .get("/:patientId/reports/out-of-range", async (c) => {
    const items = await outOfRangeFindings(c.var.db, c.var.actor, patientId(c));
    return c.json({ items });
  })
  // Report reader: the AI model copies out the values; the patient can correct them.
  .get("/:patientId/reports/:id/findings", async (c) => {
    const items = (await listFindings(c.var.db, c.var.actor, patientId(c), c.req.param("id"))) ?? notFound();
    return c.json({ items });
  })
  .post("/:patientId/reports/:id/read", async (c) => {
    const { db, actor } = c.var;
    const id = patientId(c);
    if (id !== actor.userId) return c.json({ kind: "forbidden" as const }, 403);
    if (!aiAvailable(c.env)) return c.json({ kind: "unavailable" as const }, 503);
    if (!(await consentStatus(db, actor)).ai_processing) return c.json({ kind: "consent" as const }, 403);
    const report = (await beginExtraction(db, actor, id, c.req.param("id"))) ?? notFound();
    if (!(await takeQuota(db, actor, Number(c.env.AI_DAILY_LIMIT) || 25))) {
      await failExtraction(db, report.id);
      return c.json({ kind: "quota" as const }, 429);
    }
    try {
      const file = await c.env.REPORTS.get(report.r2Key);
      if (!file) throw new Error("file missing");
      const result = await readReport(c.env, await file.arrayBuffer(), report.mime);
      if (!result.ok) {
        await Promise.all([failExtraction(db, report.id), refundQuota(db, actor)]);
        return c.json({ kind: result.reason }, 422);
      }
      await addTokens(db, actor, result.tokens);
      const items = await saveExtraction(db, report.id, result);
      return c.json({ kind: "ok" as const, summary: result.summary, items });
    } catch (err) {
      console.error("report reader error", err instanceof Error ? err.name : "unknown");
      await Promise.all([failExtraction(db, report.id), refundQuota(db, actor)]);
      return c.json({ kind: "unavailable" as const }, 503);
    }
  })
  .put(
    "/:patientId/reports/findings/:findingId",
    validator("json", (v) => parse(findingSchema, v)),
    async (c) => {
      const finding = (await updateFinding(c.var.db, c.var.actor, patientId(c), c.req.param("findingId"), c.req.valid("json"))) ?? notFound();
      return c.json({ finding });
    },
  )
  .delete("/:patientId/reports/findings/:findingId", async (c) => {
    if (!(await deleteFinding(c.var.db, c.var.actor, patientId(c), c.req.param("findingId")))) notFound();
    return c.json({ ok: true });
  })
  .delete("/:patientId/reports/:id", async (c) => {
    if (!(await deleteReport(c.var.db, c.env.REPORTS, c.var.actor, patientId(c), c.req.param("id")))) notFound();
    return c.json({ ok: true });
  })
  // Share links
  .get("/:patientId/shares", async (c) => {
    const items = await listShares(c.var.db, c.var.actor, patientId(c));
    return c.json({ items });
  })
  .post(
    "/:patientId/shares",
    validator("json", (v) => parse(shareInputSchema, v)),
    async (c) => {
      const { share, token } = await createShare(c.var.db, c.var.actor, patientId(c), c.req.valid("json"));
      return c.json({ id: share.id, expiresAt: share.expiresAt, url: `${c.env.APP_URL}/share/${token}` }, 201);
    },
  )
  .delete("/:patientId/shares/:id", async (c) => {
    if (!(await revokeShare(c.var.db, c.var.actor, patientId(c), c.req.param("id")))) notFound();
    return c.json({ ok: true });
  })
  .delete("/:patientId/symptoms/:id", async (c) => {
    const deleted = await deleteSymptom(c.var.db, c.var.actor, patientId(c), c.req.param("id"));
    if (!deleted) notFound();
    return c.json({ ok: true });
  });
