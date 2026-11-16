"use client";
import { clsx } from "clsx";
import { X, AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export const cx = clsx;

export function Card({ className, children, title, action, subtitle }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className={cx("animate-in rounded-2xl border border-border bg-surface p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-text-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone, hint }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "critical"; hint?: string }) {
  return (
    <div className="animate-in rounded-2xl border border-border bg-surface p-4" title={hint}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="tabular mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      {sub && (
        <div className={cx("tabular mt-1 text-xs", tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "critical" ? "text-critical" : "text-text-2")}>
          {sub}
        </div>
      )}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-accent text-white hover:brightness-110",
        variant === "secondary" && "border border-border bg-surface-2 text-text hover:bg-border",
        variant === "ghost" && "text-text-2 hover:bg-surface-2 hover:text-text",
        variant === "danger" && "border border-critical/40 bg-critical/10 text-critical hover:bg-critical/20",
        className,
      )}
    />
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-text-2">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

/** Zahleneingabe, die beim Tippen nicht springt; liefert number. */
export function NumberInput({ value, onChange, step = "any", min, suffix, ...rest }: { value: number | undefined; onChange: (v: number) => void; step?: string | number; min?: number; suffix?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const v = e.target.value === "" ? 0 : Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className={cx(inputCls, "tabular", suffix && "pr-10", rest.className)}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{suffix}</span>}
    </div>
  );
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputCls, "appearance-none pr-8", props.className)}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-border")}
      >
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-[2px]")} />
      </button>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "critical" | "accent" | "demo" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        tone === "neutral" && "bg-surface-2 text-text-2",
        tone === "good" && "bg-good/15 text-good",
        tone === "warn" && "bg-warn/15 text-warn",
        tone === "critical" && "bg-critical/15 text-critical",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "demo" && "bg-warn/20 font-semibold uppercase tracking-wide text-warn",
      )}
    >
      {children}
    </span>
  );
}

export function Progress({ value, tone = "accent", label }: { value: number; tone?: "accent" | "good" | "warn" | "critical"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", tone === "accent" && "bg-accent", tone === "good" && "bg-good", tone === "warn" && "bg-warn", tone === "critical" && "bg-critical")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="animate-in flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="pb-safe flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="mt-1 max-w-sm text-xs text-muted">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Missing({ children = "Daten fehlen" }: { children?: ReactNode }) {
  return <span className="text-sm font-normal italic text-muted">{children}</span>;
}

export function Alert({ tone, title, children }: { tone: "info" | "good" | "warn" | "critical"; title: ReactNode; children?: ReactNode }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "warn" ? AlertTriangle : tone === "critical" ? OctagonAlert : Info;
  return (
    <div
      className={cx(
        "flex gap-3 rounded-xl border p-3 text-sm",
        tone === "info" && "border-border bg-surface-2",
        tone === "good" && "border-good/30 bg-good/10",
        tone === "warn" && "border-warn/30 bg-warn/10",
        tone === "critical" && "border-critical/30 bg-critical/10",
      )}
    >
      <Icon size={18} className={cx("mt-0.5 shrink-0", tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "critical" ? "text-critical" : "text-muted")} aria-hidden />
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        {children && <div className="mt-0.5 whitespace-pre-line text-xs text-text-2">{children}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface-2 p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors", value === o.value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Assumption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex gap-1.5 text-[11px] leading-snug text-muted">
      <Info size={12} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function Table({ head, children, className, compact }: { head: ReactNode[]; children: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cx(!compact && "-mx-4 sm:mx-0", "overflow-x-auto", className)}>
      <table className={cx("tabular w-full text-sm", !compact && "min-w-[520px]")}>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-2 font-medium first:pl-4 sm:first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-border/60 [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-2.5 [&_td:first-child]:pl-4 sm:[&_td:first-child]:pl-0">{children}</tbody>
      </table>
    </div>
  );
}
