// Web Push on Web Crypto only: VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291).
// Network time to the push service doesn't count toward Worker CPU; the crypto is ~1–2 ms.

export type PushSubscriptionKeys = { p256dh: string; auth: string };
export type PushTarget = { endpoint: string; keys: PushSubscriptionKeys };
export type PushPayload = { title: string; body: string; url?: string; tag?: string; data?: Record<string, unknown>; actions?: { action: string; title: string }[] };

export class PushGone extends Error {} // the subscription no longer exists: delete it

const enc = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;

export function b64urlToBytes(s: string): Bytes {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const concat = (...parts: Uint8Array[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

export function pushConfigured(env: Partial<Pick<Env, "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY">>): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

let signingKey: { pub: string; key: CryptoKey } | null = null;
async function vapidKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  if (signingKey?.pub === publicKey) return signingKey.key;
  const raw = b64urlToBytes(publicKey); // 0x04 || x || y
  const jwk = { kty: "EC", crv: "P-256", x: bytesToB64url(raw.slice(1, 33)), y: bytesToB64url(raw.slice(33, 65)), d: privateKey, ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  signingKey = { pub: publicKey, key };
  return key;
}

async function vapidHeader(endpoint: string, env: Pick<Env, "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "APP_URL">): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.APP_URL })));
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await vapidKey(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY), enc.encode(unsigned));
  return `vapid t=${unsigned}.${bytesToB64url(new Uint8Array(sig))}, k=${env.VAPID_PUBLIC_KEY}`;
}

/** Encrypt a payload for one subscription (RFC 8291, single aes128gcm record). */
export async function encryptPayload(target: PushTarget, plaintext: Bytes, salt: Bytes = crypto.getRandomValues(new Uint8Array(16))) {
  const uaPublic = b64urlToBytes(target.keys.p256dh);
  const authSecret = b64urlToBytes(target.keys.auth);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey("raw", local.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export async function sendPush(env: Pick<Env, "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "APP_URL">, target: PushTarget, payload: PushPayload, ttlSeconds = 3600): Promise<void> {
  const body = await encryptPayload(target, enc.encode(JSON.stringify(payload)));
  const res = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      authorization: await vapidHeader(target.endpoint, env),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(ttlSeconds),
      urgency: "high",
      ...(payload.tag ? { topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) } : {}),
    },
    body,
  });
  if (res.status === 404 || res.status === 410) throw new PushGone(`push endpoint gone (${res.status})`);
  if (!res.ok) throw new Error(`push service responded ${res.status}`);
}
