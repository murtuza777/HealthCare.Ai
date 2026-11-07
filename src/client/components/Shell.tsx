import type { ReactNode } from "react";
import { Link } from "react-router";
import { buttonClasses, inputClass as kitInputClass } from "./ui";

// Public pages (sign-in screens, shared reports, 404) share this frame.

export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-md text-ink">
      <HeartMark />
      <span className="font-serif text-[1.3125rem] leading-none tracking-[-0.02em]">Healthcare.AI</span>
    </Link>
  );
}

/** The mark: one heartbeat stroke, drawn in ink. */
export function HeartMark({ className = "h-5 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" className={className} aria-hidden="true">
      <path d="M1 11h5l2.2-6 3.6 11 2.6-8 1.6 3H23" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-ground">{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-sheet border border-line bg-sheet p-6 sm:p-8 ${className}`}>{children}</div>;
}

export const inputClass = kitInputClass;
export const buttonClass = buttonClasses("primary");
