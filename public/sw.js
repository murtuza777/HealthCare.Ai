// Healthcare.AI service worker: medicine reminders (Web Push) and an offline app shell.
// Health data (/api/*) is never cached.

const SHELL = "shell-v1";
const ASSETS = "assets-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.add("/")).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Pages: network first, so people always get the latest app; offline falls back to the shell
  // (the emergency button and its rules work without a connection).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put("/", res.clone()));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(ASSETS).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Healthcare.AI", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Healthcare.AI";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url || "/app", ...(data.data || {}) },
      actions: data.actions || [],
      requireInteraction: Boolean(data.data && data.data.doses),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const data = n.data || {};
  n.close();

  if (event.action === "taken" && Array.isArray(data.doses)) {
    event.waitUntil(
      Promise.all(
        data.doses.map((d) =>
          fetch("/api/v1/patients/me/doses", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ medicationId: d.medicationId, scheduledAt: d.scheduledAt, status: "taken" }),
          }),
        ),
      ).then(
        (results) => {
          if (results.some((r) => !r.ok)) return openApp(data.url);
        },
        () => openApp(data.url),
      ),
    );
    return;
  }
  event.waitUntil(openApp(data.url));
});

function openApp(path) {
  const target = new URL(path || "/app", self.location.origin).href;
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.startsWith(self.location.origin) && "focus" in c) {
        c.navigate(target);
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  });
}
