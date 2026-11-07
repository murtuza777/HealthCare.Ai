import { createMiddleware } from "hono/factory";
import { getAuth } from "../auth";
import type { AppEnv } from "../types";

/**
 * Requires a signed-in user; sets c.var.user and c.var.actor.
 * Accepts either the browser session cookie or `Authorization: Bearer <JWT>` from /api/auth/token
 * (15-minute EdDSA access tokens, verified against the JWKS keys in D1).
 */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const auth = getAuth(c.env);
  const bearer = c.req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearer) {
    const { payload } = await auth.api.verifyJWT({ body: { token: bearer } });
    if (!payload?.sub) return c.json({ error: "unauthorized" }, 401);
    c.set("user", { id: payload.sub, email: String(payload.email ?? ""), name: String(payload.name ?? "") });
    c.set("actor", { userId: payload.sub });
    return next();
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const { id, email, name } = session.user;
  c.set("user", { id, email, name });
  c.set("actor", { userId: id });
  await next();
});
