import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { emailAvailable, getAuth, googleEnabled, turnstileEnabled } from "./auth";
import { AccessDenied } from "./dal/authz";
import { getDb } from "./db/client";
import { drainOutbox } from "./jobs/outbox";
import { requireSession } from "./middleware/session";
import { patients } from "./routes/patients";
import { assistant } from "./routes/assistant";
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

// What the sign-in screens should offer (public, no secrets).
app.get("/auth-config", (c) =>
  c.json({
    google: googleEnabled(c.env),
    emailVerification: emailAvailable(c.env),
    turnstileSiteKey: turnstileEnabled(c.env) ? c.env.TURNSTILE_SITE_KEY : null,
  }),
);

// Sign-in is by email + password (or Google). Email codes are only for verifying an email
// address and resetting a password, so the code-based sign-in route is closed.
app.post("/auth/sign-in/email-otp", (c) => c.json({ error: "not_found" }, 404));
app.post("/auth/email-otp/send-verification-otp", async (c, next) => {
  const body = (await c.req.raw.clone().json().catch(() => ({}))) as { type?: string };
  if (body.type === "sign-in") return c.json({ error: "not_found" }, 404);
  await next();
});
// Don't tell people "we sent a code" when no email can be delivered.
const EMAIL_ROUTES = ["/auth/email-otp/send-verification-otp", "/auth/email-otp/request-password-reset", "/auth/forget-password/email-otp"];
for (const path of EMAIL_ROUTES) {
  app.post(path, async (c, next) => {
    if (!emailAvailable(c.env)) return c.json({ code: "EMAIL_NOT_CONFIGURED", message: "Email isn't set up yet." }, 503);
    await next();
  });
}
app.on(["GET", "POST"], "/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

const v1 = new Hono<AppEnv>()
  .use("*", requireSession)
  .get("/me", (c) => c.json({ user: c.var.user }))
  .route("/patients", patients)
  .route("/assistant", assistant);

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
