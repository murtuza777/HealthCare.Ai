import { createMiddleware } from "hono/factory";
import { getAuth } from "../auth";
import type { AppEnv } from "../types";

/** Requires a signed-in user; sets c.var.user and c.var.actor. */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const { id, email, name } = session.user;
  c.set("user", { id, email, name });
  c.set("actor", { userId: id });
  await next();
});
