// Server side of password storage. See src/shared/auth.ts for the full scheme.
// Input is the browser-derived key (64 hex chars), never the raw password.
import { APIError } from "better-auth/api";
import { DERIVED_KEY } from "../shared/auth";

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(pepper: string, salt: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", k, enc.encode(`${salt}:${key}`)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordHasher(pepper: string) {
  if (!pepper || pepper.length < 32) throw new Error("PASSWORD_PEPPER must be set (32+ random characters).");
  return {
    async hash(derivedKey: string): Promise<string> {
      // Rejects raw passwords: an old or third-party client must not store a weakly protected one.
      if (!DERIVED_KEY.test(derivedKey)) throw new APIError("BAD_REQUEST", { message: "Invalid password format." });
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      return `hmac-v1$${salt}$${await hmac(pepper, salt, derivedKey)}`;
    },
    async verify({ hash, password }: { hash: string; password: string }): Promise<boolean> {
      if (!DERIVED_KEY.test(password)) return false;
      const [scheme, salt, expected] = hash.split("$");
      if (scheme !== "hmac-v1" || !salt || !expected) return false;
      return timingSafeEqual(await hmac(pepper, salt, password), expected);
    },
  };
}
