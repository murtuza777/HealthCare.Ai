import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { emailSignInAvailable, getAuth } from "./auth";
import { AccessDenied } from "./dal/authz";
import { getDb } from "./db/client";
import { drainOutbox } from "./jobs/outbox";
import { requireSession } from "./middleware/session";
import { patients } from "./routes/patients";
import { publicRoutes } from "./routes/public";
import { ShareError } from "./dal/shares";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", secureHeaders());
app.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.set("db", getDb(c.env));
  await next();
});

app.get("/health", (c) => c.json({ ok: true }));
// Don't let the login page say "we sent a code" when no email can be delivered.
app.post("/auth/email-otp/send-verification-otp", async (c, next) => {
  if (!emailSignInAvailable(c.env)) return c.json({ code: "EMAIL_NOT_CONFIGURED", message: "Email sign-in isn't set up yet." }, 503);
  await next();
});
app.on(["GET", "POST"], "/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

const v1 = new Hono<AppEnv>()
  .use("*", requireSession)
  .get("/me", (c) => c.json({ user: c.var.user }))
  .route("/patients", patients);

const routes = app.route("/v1", v1).route("/public", publicRoutes);
export type AppType = typeof routes;

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  if (err instanceof AccessDenied) return c.json({ error: "forbidden" }, 403);
  if (err instanceof ShareError) return c.json({ error: "invalid_input", fields: [{ path: "reportIds", message: err.message }] }, 400);
  if (err instanceof HTTPException) return err.getResponse();
  if (err instanceof SyntaxError) return c.json({ error: "invalid_json" }, 400);
  // Never log request bodies: they may contain health data.
  console.error("unhandled", err instanceof Error ? `${err.name}: ${err.message}` : "unknown error");
  return c.json({ error: "internal_error" }, 500);
});

export default {
  fetch: routes.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(drainOutbox(env));
  },
} satisfies ExportedHandler<Env>;
