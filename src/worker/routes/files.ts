// Helpers for report files: reading uploads safely and streaming downloads.
import { HTTPException } from "hono/http-exception";
import { MAX_REPORT_BYTES, reportMetaSchema, sniffMime, type AllowedMime, type ReportMeta } from "../../shared/reports";
import { parse } from "../middleware/validate";

const fail = (status: 400 | 413 | 415, error: string, message: string): never => {
  throw new HTTPException(status, { res: Response.json({ error, fields: [{ path: "file", message }] }, { status }) });
};

/**
 * Upload format: the raw file is the request body; metadata is base64url JSON in X-Report-Meta
 * (kept out of the URL so titles never land in logs).
 */
export async function readUpload(req: Request): Promise<{ meta: ReportMeta; bytes: ArrayBuffer; mime: AllowedMime }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_REPORT_BYTES) fail(413, "too_large", "Files can be up to 10 MB.");

  const rawMeta = req.headers.get("x-report-meta");
  if (!rawMeta) fail(400, "invalid_input", "Missing report details.");
  let metaJson: unknown;
  try {
    const b64 = rawMeta!.replace(/-/g, "+").replace(/_/g, "/");
    metaJson = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))));
  } catch {
    fail(400, "invalid_input", "Report details are malformed.");
  }
  const meta = parse(reportMetaSchema, metaJson);

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) fail(400, "invalid_input", "The file is empty.");
  if (bytes.byteLength > MAX_REPORT_BYTES) fail(413, "too_large", "Files can be up to 10 MB.");
  // Trust the file's own signature, not the declared Content-Type.
  const mime = sniffMime(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)));
  if (!mime) fail(415, "unsupported_type", "Upload a PDF, JPEG, PNG or WebP file.");
  return { meta, bytes, mime: mime! };
}

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Stream an R2 object to the browser with safe headers. */
export async function fileResponse(bucket: R2Bucket, key: string, mime: string, title: string, download: boolean): Promise<Response> {
  const obj = await bucket.get(key);
  if (!obj) throw new HTTPException(404, { res: Response.json({ error: "not_found" }, { status: 404 }) });
  const safeName = `${title.replace(/[^\w\- ]+/g, "").trim().slice(0, 80) || "report"}.${EXT[mime] ?? "bin"}`;
  return new Response(obj.body, {
    headers: {
      "Content-Type": mime, // from our sniffed allowlist, never from the uploader
      "Content-Length": String(obj.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

/** Keyed hash of the visitor IP for the share access log (raw IPs are never stored). */
export async function hashIp(ip: string | null, secret: string): Promise<string | null> {
  if (!ip) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return [...new Uint8Array(sig).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
