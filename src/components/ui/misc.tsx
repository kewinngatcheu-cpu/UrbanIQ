import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-cloud/70 bg-snow/60 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-soft [&_svg]:size-5">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-fog", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", v > 90 ? "bg-peach-ink/70" : "bg-gradient-to-r from-primary to-accent")} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Notice({ tone = "blue", children, className }: { tone?: "blue" | "mint" | "peach" | "rose" | "lavender"; children: React.ReactNode; className?: string }) {
  const tones = {
    blue: "bg-mist text-accent-strong border-sky",
    mint: "bg-mint text-mint-ink border-[#cdeedd]",
    peach: "bg-peach text-peach-ink border-[#ffe2cf]",
    rose: "bg-rose text-rose-ink border-[#ffd9de]",
    lavender: "bg-lavender text-lavender-ink border-[#e2dcff]",
  };
  return <div className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", tones[tone], className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft rounded-xl bg-fog", className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</kbd>;
}
