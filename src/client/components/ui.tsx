import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import type { Classification } from "../../shared/vitals";

// Quiet record UI kit. Sections are separated by space and a hairline, not boxed.
// Buttons are ink pills that press; status is a dot and a word.

export const inputClass =
  "block w-full rounded-control border border-line-strong bg-sheet px-3.5 py-2.5 text-base text-ink transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-ink-faint hover:border-ink-faint/60 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/[0.06] disabled:bg-well disabled:text-ink-muted aria-[invalid=true]:border-danger";

/**
 * A section of a page. Plain by default: no box, separated from its neighbours by space.
 * `boxed` draws a bordered surface for the rare thing that must read as one object (a form, a table).
 * `flush` drops the inner padding of a boxed surface for edge-to-edge tables.
 */
export function Card({
  children,
  className = "",
  as: Tag = "section",
  flush = false,
  boxed = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  flush?: boolean;
  boxed?: boolean;
}) {
  const look = boxed || flush ? `rounded-sheet border border-line bg-sheet ${flush ? "overflow-hidden" : "p-5 sm:p-6"}` : "";
  return <Tag className={`${look} ${className}`}>{children}</Tag>;
}

/** Section heading row: title on the left, an optional action on the right. */
export function SheetHeader({ title, action, description }: { title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <div>
        <h2 className="text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-quiet";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85",
  secondary: "border border-line-strong bg-sheet text-ink hover:border-ink/30 hover:bg-well/60",
  ghost: "text-ink-muted hover:bg-well hover:text-ink",
  danger: "bg-danger text-white hover:bg-danger-hover",
  "danger-quiet": "text-ink-faint hover:bg-danger-soft hover:text-danger",
};
const SIZES = { md: "min-h-11 px-5 text-[0.9375rem]", sm: "min-h-9 px-3.5 text-sm" };

export const buttonClasses = (variant: Variant = "primary", size: keyof typeof SIZES = "md") =>
  `inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-[560] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 ${SIZES[size]} ${VARIANTS[variant]}`;

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
      <span className="mb-1.5 block text-sm font-[540] text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-ink-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-prose text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS: Record<Classification, { dot: string; text: string; strong?: boolean }> = {
  normal: { dot: "bg-status-normal", text: "Normal" },
  borderline: { dot: "bg-status-borderline", text: "Borderline" },
  high: { dot: "bg-status-high", text: "High" },
  low: { dot: "bg-status-low", text: "Low" },
  critical: { dot: "bg-danger", text: "Emergency range", strong: true },
};

/** Classification: a coloured dot and a word. Only the emergency range raises its voice. */
export function StatusBadge({ value }: { value: Classification | null | undefined }) {
  if (!value) return null;
  const s = STATUS[value];
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-sm ${s.strong ? "font-semibold text-danger" : "text-ink-muted"}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}

export function EmptyState({ title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 py-4">
      <p className="font-[560] text-ink">{title}</p>
      <p className="max-w-prose text-ink-muted">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
  return (
    <p role="alert" className="mt-3 text-sm font-[540] text-danger">
      {message}
    </p>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success"; children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2.5 rounded-control bg-well px-4 py-3 text-sm text-ink">
      <span aria-hidden="true" className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${tone === "success" ? "bg-status-normal" : "bg-action"}`} />
      <span>{children}</span>
    </p>
  );
}

/** Skeleton lines while data loads (no spinners in the middle of content). */
export function Loading({ label = "Loading", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-2">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-3.5 animate-pulse rounded-full bg-well" style={{ width: `${88 - i * 20}%` }} />
      ))}
    </div>
  );
}

/** Small label + value pair. */
export function Datum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="figures text-ink">{children}</dd>
    </div>
  );
}
