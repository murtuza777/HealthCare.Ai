// /api/v1/care/...  Caretaker invites (patient side) and the caretaker's view of patients.
// Every read of a patient's data still goes through the DAL's permission checks.
import { Hono } from "hono";
import { validator } from "hono/validator";
import { careAcceptSchema, careInviteSchema, carePermissionsSchema, quietHoursSchema } from "../../shared/care";
import { emergencyNumber } from "../../shared/emergency";
import { acknowledgeAlert, listAlerts } from "../dal/alerts";
import {
  acceptInvite,
  inviteCaretaker,
  listCaretakers,
  listPatientsCaredFor,
  previewInvite,
  revokeCareLink,
  setQuietHours,
  updateCarePermissions,
} from "../dal/care";
import { adherence, dosesForDay } from "../dal/doses";
import { listMedications } from "../dal/medications";
import { getProfile } from "../dal/profile";
import { enqueue } from "../jobs/outbox";
import { audit } from "../dal/account";
import { listReports } from "../dal/reports";
import { listSymptoms } from "../dal/symptoms";
import { latestVitals, listVitals } from "../dal/vitals";
import { notFound, parse } from "../middleware/validate";
import type { AppEnv } from "../types";

export const care = new Hono<AppEnv>()
  // --- Patient: who can see my record --------------------------------------
  .get("/caretakers", async (c) => c.json({ items: await listCaretakers(c.var.db, c.var.actor) }))
  .post(
    "/caretakers",
    validator("json", (v) => parse(careInviteSchema, v)),
    async (c) => {
      const input = c.req.valid("json");
      const { link, token, patientName } = await inviteCaretaker(c.var.db, c.var.actor, input);
      const inviteUrl = `${c.env.APP_URL}/care/accept/${token}`;
      let emailed = false;
      if (c.env.RESEND_API_KEY) {
        await enqueue(c.var.db, { channel: "email", recipient: input.email, kind: "care:invite", payload: { patientName, url: inviteUrl } });
        emailed = true;
      }
      return c.json({ id: link.id, inviteUrl, emailed }, 201);
    },
  )
  .patch(
    "/caretakers/:id",
    validator("json", (v) => parse(carePermissionsSchema, v)),
    async (c) => {
      const link = (await updateCarePermissions(c.var.db, c.var.actor, c.req.param("id"), c.req.valid("json").permissions)) ?? notFound();
      return c.json({ id: link.id, permissions: link.permissions });
    },
  )
  .delete("/caretakers/:id", async (c) => {
    if (!(await revokeCareLink(c.var.db, c.var.actor, c.req.param("id")))) notFound();
    return c.json({ ok: true });
  })

  // --- Caretaker: invites and the people I care for -------------------------
  .get("/invites/:token", async (c) => {
    const invite = (await previewInvite(c.var.db, c.req.param("token"))) ?? notFound();
    return c.json(invite);
  })
  .post(
    "/accept",
    validator("json", (v) => parse(careAcceptSchema, v)),
    async (c) => {
      const link = await acceptInvite(c.var.db, c.var.actor, c.req.valid("json").token);
      return c.json({ patientId: link.patientId });
    },
  )
  .get("/patients", async (c) => c.json({ items: await listPatientsCaredFor(c.var.db, c.var.actor) }))
  .get("/patients/:patientId/summary", async (c) => {
    const { db, actor } = c.var;
    const patientId = c.req.param("patientId");
    const link = (await listPatientsCaredFor(db, actor)).find((p) => p.patientId === patientId) ?? notFound();
    const can = (p: string) => link.permissions.includes(p as never);
    const profile = await getProfile(db, actor, patientId);
    await audit(db, { actorId: actor.userId, subjectUserId: patientId, action: "caretaker.viewed", entity: "summary" });

    const [latest, bp, hr, symptoms, doses, week, meds, reports, alerts] = await Promise.all([
      can("vitals") ? latestVitals(db, actor, patientId) : null,
      can("vitals") ? listVitals(db, actor, patientId, { type: "blood_pressure", limit: 30 }) : null,
      can("vitals") ? listVitals(db, actor, patientId, { type: "heart_rate", limit: 30 }) : null,
      can("vitals") ? listSymptoms(db, actor, patientId, 10) : null,
      can("meds") ? dosesForDay(db, actor, patientId) : null,
      can("meds") ? adherence(db, actor, patientId, 7) : null,
      can("meds") ? listMedications(db, actor, patientId) : null,
      can("reports") ? listReports(db, actor, patientId) : null,
      can("alerts") ? listAlerts(db, actor, patientId, 10) : null,
    ]);

    return c.json({
      patient: {
        id: patientId,
        name: link.name,
        emergencyNumber: emergencyNumber(profile?.country),
        emergencyContact: profile?.emergencyContact ?? null,
        conditions: profile?.conditions ?? [],
      },
      permissions: link.permissions,
      quietHours: link.quietHours,
      latest,
      trends: bp && hr ? { bloodPressure: bp, heartRate: hr } : null,
      symptoms,
      doses,
      adherence: week,
      medications: meds,
      reports: reports?.map(({ r2Key: _key, ...r }) => r) ?? null,
      alerts,
    });
  })
  .put(
    "/patients/:patientId/quiet-hours",
    validator("json", (v) => parse(quietHoursSchema, v)),
    async (c) => {
      if (!(await setQuietHours(c.var.db, c.var.actor, c.req.param("patientId"), c.req.valid("json").quietHours))) notFound();
      return c.json({ ok: true });
    },
  )
  .post("/patients/:patientId/alerts/:alertId/ack", async (c) => {
    if (!(await acknowledgeAlert(c.var.db, c.var.actor, c.req.param("patientId"), c.req.param("alertId")))) notFound();
    return c.json({ ok: true });
  });
