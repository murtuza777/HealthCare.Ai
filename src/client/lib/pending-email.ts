// The email being verified or reset is carried between the sign-up, sign-in, verify and reset
// pages in this tab's session storage, never in the URL: addresses in URLs end up in browser
// history and in request logs.
const KEY = "pending-email";

export function rememberEmail(email: string) {
  try {
    sessionStorage.setItem(KEY, email.trim());
  } catch {
    // Storage can be blocked; the next page then simply asks for the email again.
  }
}

export function rememberedEmail(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function forgetEmail() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
}
