import { normalizeEmail, PASSWORD_KDF } from "../../shared/auth";

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/**
 * Stretch the password on this device (PBKDF2-SHA256, 600,000 rounds) and return the key the server stores
 * a keyed hash of. The raw password never leaves the browser. See src/shared/auth.ts for why.
 * Takes ~0.1–0.5 s depending on the device.
 */
export async function derivePasswordKey(email: string, password: string): Promise<string> {
  const base = await crypto.subtle.importKey("raw", enc.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(PASSWORD_KDF.saltPrefix + normalizeEmail(email)), iterations: PASSWORD_KDF.iterations },
    base,
    256,
  );
  return toHex(bits);
}

/**
 * How many times this password appears in known data breaches (Have I Been Pwned, k-anonymity:
 * only the first 5 characters of its SHA-1 hash are sent). Returns null if the check can't run.
 */
export async function breachCount(password: string): Promise<number | null> {
  try {
    const sha1 = toHex(await crypto.subtle.digest("SHA-1", enc.encode(password))).toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, { headers: { "Add-Padding": "true" } });
    if (!res.ok) return null;
    const suffix = sha1.slice(5);
    for (const line of (await res.text()).split("\n")) {
      const [hash, count] = line.trim().split(":");
      if (hash === suffix) return Number(count);
    }
    return 0;
  } catch {
    return null; // offline or blocked: don't stop sign-up over it
  }
}
