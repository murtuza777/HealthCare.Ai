import { hc } from "hono/client";
import type { AppType } from "../../worker";

/** Typed API client: routes, params and responses come from the Worker's types. */
export const api = hc<AppType>("/").api.v1;

/** Account-free endpoints (share links). */
export const publicApi = hc<AppType>("/").api.public;

/** Throw on non-2xx so TanStack Query treats it as an error. */
export async function ok<T>(res: { ok: boolean; status: number; json(): Promise<T> }): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: { path: string; message: string }[] };
    throw Object.assign(new Error(body.fields?.[0]?.message ?? body.error ?? `Request failed (${res.status})`), { status: res.status });
  }
  return res.json();
}
