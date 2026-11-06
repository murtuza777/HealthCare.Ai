// Public, account-free access through a share token (what a doctor opens from the QR code).
// The token is the only credential; every request re-checks expiry and revocation.
import { Hono } from "hono";
import { sharedReport, viewShare } from "../dal/shares";
import { notFound } from "../middleware/validate";
import type { AppEnv } from "../types";
import { fileResponse, hashIp } from "./files";

export const publicRoutes = new Hono<AppEnv>()
  .get("/shares/:token", async (c) => {
    const ipHash = await hashIp(c.req.header("cf-connecting-ip") ?? null, c.env.BETTER_AUTH_SECRET);
    const view = await viewShare(c.var.db, c.req.param("token"), { ipHash, userAgent: c.req.header("user-agent") ?? null });
    // Same response for unknown, expired and revoked links: nothing to learn by probing.
    if (!view) return c.json({ error: "link_unavailable" }, 404);
    return c.json(view);
  })
  .get("/shares/:token/reports/:reportId/file", async (c) => {
    const report = (await sharedReport(c.var.db, c.req.param("token"), c.req.param("reportId"))) ?? notFound();
    return fileResponse(c.env.REPORTS, report.r2Key, report.mime, report.title, c.req.query("download") === "1");
  });
