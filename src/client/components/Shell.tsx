import type { ReactNode } from "react";

/** Dark full-height background used across the app (matches the legacy look). */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 text-white">
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur ${className}`}>{children}</div>;
}

export const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";
export const buttonClass =
  "rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50";
