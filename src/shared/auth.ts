// Password handling shared by the browser and the Worker.
//
// Why passwords are stretched in the browser: the free Workers plan allows ~10 ms of CPU per request,
// and a proper server-side password hash (scrypt/PBKDF2) costs 60–150 ms (docs/TECH_PLAN.md §13).
// So the slow part runs on the user's device:
//   browser: key = PBKDF2-SHA256(password, salt = PREFIX + email, 600,000 rounds)  → 64 hex chars
//   server:  stored = HMAC-SHA256(PASSWORD_PEPPER, randomSalt ‖ key)              → ~0.1 ms
// A stolen database still costs an attacker 600,000 PBKDF2 rounds per guess, plus the secret pepper.
// The same pattern is used by Bitwarden and 1Password. The server never sees the real password,
// so password rules are enforced in the browser (passwordProblems below).

export const PASSWORD_KDF = {
  iterations: 600_000, // OWASP 2023 recommendation for PBKDF2-HMAC-SHA256
  saltPrefix: "healthcare-ai:v1:",
} as const;

/** What the browser sends instead of the password: 32 bytes as lowercase hex. */
export const DERIVED_KEY = /^[0-9a-f]{64}$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const MIN_PASSWORD_LENGTH = 10;

/** Client-side password rules (the server only ever sees the derived key). */
export function passwordProblems(password: string, email = ""): string[] {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) problems.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (password.length > 256) problems.push("Use at most 256 characters.");
  if (/^\d+$/.test(password)) problems.push("Don't use only numbers.");
  if (new Set(password).size < 4) problems.push("Use a less repetitive password.");
  const local = normalizeEmail(email).split("@")[0];
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) problems.push("Don't include your email address.");
  return problems;
}
