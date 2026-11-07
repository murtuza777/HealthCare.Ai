// Reminders on this device: service worker registration and Web Push subscription.

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export type EnableResult = "on" | "denied" | "unsupported" | "error";

export async function enableReminders(publicKey: string): Promise<EnableResult> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  try {
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const res = await fetch("/api/v1/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    return res.ok ? "on" : "error";
  } catch {
    return "error";
  }
}

export async function disableReminders(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/v1/push/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
  await sub.unsubscribe();
}

export async function sendTestReminder(): Promise<boolean> {
  const res = await fetch("/api/v1/push/test", { method: "POST" });
  return res.ok && ((await res.json()) as { queued: number }).queued > 0;
}
