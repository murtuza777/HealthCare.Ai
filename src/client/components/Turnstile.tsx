import { useEffect, useRef } from "react";

// Cloudflare Turnstile (bot protection). Renders nothing when no site key is configured.
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load the security check."));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Calls onToken with a fresh token (or null when it expires). Change `resetKey` to get a new token
 * after a failed attempt (each token can be used once).
 */
export function Turnstile({ siteKey, onToken, resetKey = 0 }: { siteKey: string | null; onToken: (t: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken; // always call the latest callback without re-rendering the widget
  });

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widget.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "light",
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && widget.current && window.turnstile) {
      cb.current(null);
      window.turnstile.reset(widget.current);
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
