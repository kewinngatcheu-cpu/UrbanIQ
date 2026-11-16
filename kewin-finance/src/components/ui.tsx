"use client";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export const cx = clsx;

export function Card({ title, action, children, className, subtitle }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("animate-rise rounded-3xl border border-border bg-surface p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-text-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone, big }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad"; big?: boolean }) {
  return (
    <div className="animate-rise rounded-3xl border border-border bg-surface p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cx("tabular mt-1 font-semibold tracking-tight", big ? "text-3xl" : "text-xl")}>{value}</div>
      {sub && <div className={cx("tabular mt-0.5 text-xs", tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-text-2")}>{sub}</div>}
    </div>
  );
}

export function Button({ variant = "secondary", size = "md", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-5 text-base",
        variant === "primary" && "bg-accent text-white hover:brightness-110",
        variant === "secondary" && "border border-border bg-surface-2 hover:bg-border",
        variant === "ghost" && "text-text-2 hover:bg-surface-2",
        variant === "danger" && "bg-bad/10 text-bad hover:bg-bad/20",
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

const inputCls = "h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-base outline-none focus:border-accent";

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}

/** Euro-Eingabe: Dezimaltastatur auf dem iPhone, Komma und Punkt erlaubt. */
export function MoneyInput({ value, onChange, autoFocus, large, ...rest }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; large?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <input
        {...rest}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
        className={cx(inputCls, "tabular pr-10", large && "h-16 text-3xl font-semibold")}
      />
      <span className={cx("pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted", large ? "text-2xl" : "text-base")}>€</span>
    </div>
  );
}

export function Select({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(inputCls, "appearance-none", p.className)}>
      {children}
    </select>
  );
}

export function Progress({ value, tone = "accent", label, thick }: { value: number; tone?: "accent" | "good" | "warn" | "bad"; label: string; thick?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className={cx("w-full overflow-hidden rounded-full bg-surface-2", thick ? "h-3" : "h-2")}>
      <div className={cx("h-full rounded-full transition-[width] duration-700 ease-out", { accent: "bg-accent", good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "accent" }) {
  return (
    <span className={cx("inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium", { neutral: "bg-surface-2 text-text-2", good: "bg-good/15 text-good", warn: "bg-warn/15 text-warn", bad: "bg-bad/15 text-bad", accent: "bg-accent/15 text-accent" }[tone])}>
      {children}
    </span>
  );
}

/** Bottom-Sheet auf dem iPhone, zentrierter Dialog auf größeren Bildschirmen. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="animate-sheet flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-[28px] border border-border bg-surface sm:rounded-[28px]">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Schließen" className="rounded-full bg-surface-2 p-1.5 text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-3">{children}</div>
        {footer && <div className="pb-safe flex gap-2 border-t border-border px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div role="tablist" className={cx("flex rounded-2xl bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition", value === o.value ? "bg-surface text-text shadow-sm" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-7 text-center">
      <div className="text-sm font-semibold">{title}</div>
      {text && <div className="mt-1 max-w-xs text-xs text-muted">{text}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[11px] leading-snug text-muted">{children}</p>;
}
