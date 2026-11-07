import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import type { Classification } from "../../shared/vitals";

// Clinic chart UI kit. Sheets with hairline rules, solid buttons, legible fields.
// No entrance animation: product screens load straight into the task.

export const inputClass =
  "block w-full rounded-control border border-line-strong bg-sheet px-3.5 py-2.5 text-base text-ink shadow-[inset_0_1px_1px_rgba(20,48,90,0.04)] transition-colors placeholder:text-ink-faint hover:border-ink-faint focus:border-action focus:outline-none focus:ring-2 focus:ring-action/25 disabled:bg-well disabled:text-ink-muted aria-[invalid=true]:border-danger";

/** A chart sheet: white panel on the porcelain ground. `flush` drops the padding for edge-to-edge tables. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  flush?: boolean;
}) {
  return (
    <Tag className={`rounded-sheet border border-line bg-sheet shadow-sheet ${flush ? "overflow-hidden" : "p-5 sm:p-6"} ${className}`}>{children}</Tag>
  );
}

/** Sheet heading row: title on the left, an optional action on the right. */
export function SheetHeader({ title, action, description }: { title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-quiet";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-action text-white hover:bg-action-hover active:translate-y-px",
  secondary: "border border-line-strong bg-sheet text-ink hover:border-ink-faint hover:bg-well active:translate-y-px",
  ghost: "text-action hover:bg-action-soft",
  danger: "bg-danger text-white hover:bg-danger-hover active:translate-y-px",
  "danger-quiet": "text-danger hover:bg-danger-soft",
};
const SIZES = { md: "min-h-11 px-4 text-base", sm: "min-h-9 px-3 text-sm" };

export const buttonClasses = (variant: Variant = "primary", size: keyof typeof SIZES = "md") =>
  `inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,border-color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-55 ${SIZES[size]} ${VARIANTS[variant]}`;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <button {...props} className={`${buttonClasses(variant, size)} ${className}`} />;
}

/** A link styled as a button (navigation, not an action). */
export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: LinkProps & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <Link {...props} className={`${buttonClasses(variant, size)} ${className}`} />;
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-ink-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS: Record<Classification, { cls: string; text: string }> = {
  normal: { cls: "bg-status-normal-bg text-status-normal", text: "Normal" },
  borderline: { cls: "bg-status-borderline-bg text-status-borderline", text: "Borderline" },
  high: { cls: "bg-status-high-bg text-status-high", text: "High" },
  low: { cls: "bg-status-low-bg text-status-low", text: "Low" },
  critical: { cls: "bg-danger text-white", text: "Emergency range" },
};

/** Classification chip. Always a word as well as a colour. */
export function StatusBadge({ value }: { value: Classification | null | undefined }) {
  if (!value) return null;
  const s = STATUS[value];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${s.cls}`}>{s.text}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 py-6">
      <div className="text-ink-faint">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="max-w-prose text-ink-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
  return (
    <p role="alert" className="mt-3 text-sm font-semibold text-danger">
      {message}
    </p>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success"; children: ReactNode }) {
  const cls = tone === "success" ? "bg-status-normal-bg text-status-normal" : "bg-action-soft text-ink";
  return (
    <p role="status" className={`rounded-control px-3.5 py-2.5 text-sm font-semibold ${cls}`}>
      {children}
    </p>
  );
}

/** Skeleton lines while data loads (no spinners in the middle of content). */
export function Loading({ label = "Loading", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-well" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  );
}

/** Small label + value pair used in chart tables. */
export function Datum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="figures text-ink">{children}</dd>
    </div>
  );
}
