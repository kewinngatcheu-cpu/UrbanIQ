import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/lib/config/plans";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanCards({ ctaHref = (p: PlanId) => `/register?plan=${p}`, ctaLabel = (p: PlanId) => (p === "free" ? "Start for free" : `Choose ${PLANS[p].name}`), current }: {
  ctaHref?: (p: PlanId) => string;
  ctaLabel?: (p: PlanId) => string;
  current?: PlanId;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        const isCurrent = current === id;
        return (
          <div
            key={id}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-white p-7 transition duration-300 hover:-translate-y-0.5",
              p.highlight ? "border-cloud shadow-glow" : "border-line shadow-soft hover:shadow-lift",
            )}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wide text-white shadow-soft">MOST POPULAR</span>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
              {isCurrent && <span className="rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-medium text-mint-ink">Current plan</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-ink">{formatPrice(p.priceMonthlyEur)}</span>
              <span className="text-sm text-muted">/ month</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14px] text-ink">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-mist text-accent">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            {!isCurrent && (
              <Link href={ctaHref(id)} className={cn(buttonVariants({ variant: p.highlight ? "primary" : "secondary", size: "lg" }), "mt-8 w-full")}>
                {ctaLabel(id)}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
