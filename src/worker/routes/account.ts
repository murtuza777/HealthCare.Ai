// /api/v1/account/...  Consent, data export, account deletion and "who looked at my record".
import { Hono } from "hono";
import { validator } from "hono/validator";
import { consentBodySchema, deleteAccountSchema } from "../../shared/account";
import { getAuth } from "../auth";
import { accessLog, audit, consentStatus, deleteAccount, exportAccount, recordConsents } from "../dal/account";
import { parse } from "../middleware/validate";
import type { AppEnv } from "../types";

export const account = new Hono<AppEnv>()
  .get("/consents", async (c) => c.json(await consentStatus(c.var.db, c.var.actor)))
  .post(
    "/consents",
    validator("json", (v) => parse(consentBodySchema, v)),
    async (c) => c.json(await recordConsents(c.var.db, c.var.actor, c.req.valid("json").kinds)),
  )
  .get("/access-log", async (c) => c.json({ items: await accessLog(c.var.db, c.var.actor) }))
  .get("/export", async (c) => {
    const data = await exportAccount(c.var.db, c.var.actor);
    await audit(c.var.db, { actorId: c.var.actor.userId, subjectUserId: c.var.actor.userId, action: "account.exported", entity: "user" });
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="healthcare-ai-export-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  })
  .post(
    "/delete",
    validator("json", (v) => parse(deleteAccountSchema, v)),
    async (c) => {
      // Sign out first (clears the session cookie), then remove everything.
      const signOut = await getAuth(c.env).api.signOut({ headers: c.req.raw.headers, asResponse: true });
      const result = await deleteAccount(c.var.db, c.env.REPORTS, c.var.actor);
      const res = c.json({ ok: true, ...result });
      for (const cookie of signOut.headers.getSetCookie()) res.headers.append("Set-Cookie", cookie);
      return res;
    },
  );
