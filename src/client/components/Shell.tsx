import type { ReactNode } from "react";
import { Link } from "react-router";
import { buttonClasses, inputClass as kitInputClass } from "./ui";

// Public pages (sign-in screens, shared reports, 404) share this frame.

export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
      <HeartMark />
      Healthcare.AI
    </Link>
  );
}

/** The mark: a single heartbeat stroke inside a rounded square. */
export function HeartMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width="27" height="27" rx="7" fill="#14305A" />
      <path d="M4 15h5l2-5 3.5 10 2.5-7 1.5 2H24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-ground">{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-sheet border border-line bg-sheet p-6 shadow-sheet sm:p-8 ${className}`}>{children}</div>;
}

export const inputClass = kitInputClass;
export const buttonClass = buttonClasses("primary");
