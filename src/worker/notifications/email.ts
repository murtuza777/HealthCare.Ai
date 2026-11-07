// Email delivery through Resend's HTTP API. Network time doesn't count toward Worker CPU.

export type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(env: Pick<Env, "RESEND_API_KEY" | "EMAIL_FROM">, email: Email): Promise<void> {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...email }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderEmail(kind: string, payload: Record<string, unknown>): Omit<Email, "to"> {
  if (kind.startsWith("otp:")) {
    const code = escapeHtml(String(payload.otp ?? ""));
    return {
      subject: `${code} is your Healthcare.AI sign-in code`,
      text: `Your Healthcare.AI sign-in code is ${code}. It expires in 5 minutes. If you didn't request it, ignore this email.`,
      html: `<p>Your Healthcare.AI sign-in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 5 minutes. If you didn't request it, ignore this email.</p>`,
    };
  }
  if (kind === "care:invite") {
    const name = escapeHtml(String(payload.patientName || "Someone"));
    const url = escapeHtml(String(payload.url ?? ""));
    return {
      subject: `${name} invited you to Healthcare.AI`,
      text: `${name} would like you to help look after their heart health on Healthcare.AI. Accept the invite (it expires in 7 days): ${url}`,
      html: `<p>${name} would like you to help look after their heart health on Healthcare.AI.</p><p><a href="${url}">Accept the invite</a> (it expires in 7 days).</p><p>If you weren't expecting this, you can ignore this email.</p>`,
    };
  }
  if (kind === "care:alert") {
    const title = escapeHtml(String(payload.title ?? "Healthcare.AI alert"));
    const body = escapeHtml(String(payload.body ?? ""));
    const url = escapeHtml(String(payload.url ?? ""));
    return {
      subject: title,
      text: `${title}\n\n${body}\n\n${url}`,
      html: `<p><strong>${title}</strong></p><p>${body}</p><p><a href="${url}">Open Healthcare.AI</a></p>`,
    };
  }
  throw new Error(`No email template for ${kind}`);
}
