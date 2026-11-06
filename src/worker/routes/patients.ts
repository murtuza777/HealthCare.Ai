// /api/v1/patients/:patientId/...  (":patientId" may be "me")
// Caretaker access to another patient is decided by the DAL, not here.
import { Hono, type Context } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { profileInputSchema } from "../../shared/profile";
import { VITAL_TYPES, vitalInputSchema } from "../../shared/vitals";
import { medicationInputSchema, medicationUpdateSchema } from "../../shared/medications";
import { symptomInputSchema } from "../../shared/symptoms";
import { addMedication, deleteMedication, listMedications, setMedicationActive } from "../dal/medications";
import { getProfile, upsertProfile } from "../dal/profile";
import { createReport, deleteReport, getReport, listReports } from "../dal/reports";
import { createShare, listShares, revokeShare } from "../dal/shares";
import { shareInputSchema } from "../../shared/reports";
import { fileResponse, readUpload } from "./files";
import { addSymptom, deleteSymptom, listSymptoms } from "../dal/symptoms";
import { addVital, latestVitals, listVitals } from "../dal/vitals";
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

export const patients = new Hono<AppEnv>()
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
      return c.json({ vital }, 201);
    },
  )
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
