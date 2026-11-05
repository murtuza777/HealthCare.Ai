// /api/v1/patients/:patientId/...  (":patientId" may be "me")
// Caretaker access to another patient is decided by the DAL, not here.
import { Hono, type Context } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { profileInputSchema } from "../../shared/profile";
import { VITAL_TYPES, vitalInputSchema } from "../../shared/vitals";
import { getProfile, upsertProfile } from "../dal/profile";
import { addVital, listVitals } from "../dal/vitals";
import { parse } from "../middleware/validate";
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
  );
