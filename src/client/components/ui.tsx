import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import type { Classification } from "../../shared/vitals";

export const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";

export function Card({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md ${className}`}
    >
      {children}
    </motion.section>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg hover:shadow-red-500/30",
  secondary: "bg-white/10 text-white hover:bg-white/20",
  ghost: "text-gray-300 hover:text-white",
  danger: "bg-red-900/40 text-red-200 hover:bg-red-900/70",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm text-gray-300 ${className}`}>
      <span className="mb-1 block font-medium text-gray-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-300">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE: Record<Classification, string> = {
  normal: "bg-emerald-500/20 text-emerald-300",
  borderline: "bg-yellow-500/20 text-yellow-300",
  high: "bg-orange-500/20 text-orange-300",
  low: "bg-sky-500/20 text-sky-300",
  critical: "bg-red-600 text-white",
};
const BADGE_TEXT: Record<Classification, string> = {
  normal: "Normal",
  borderline: "Borderline",
  high: "High",
  low: "Low",
  critical: "Emergency range",
};

export function StatusBadge({ value }: { value: Classification | null | undefined }) {
  if (!value) return null;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[value]}`}>{BADGE_TEXT[value]}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-red-500">{icon}</div>
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="max-w-md text-gray-400">{body}</p>
      {action}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <p role="alert" className="mt-3 text-sm text-red-400">
      {message}
    </p>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-6 text-gray-400">{label}</p>;
}
