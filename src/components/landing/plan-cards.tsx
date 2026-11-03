import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Check } from "lucide-react";
import { formatPrice, type Plan, type PlanId, type World } from "@/lib/config/plans";
import { plansFor } from "@/lib/plans-store";
import { getLocale } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function PlanCards({ world = "personal", ctaHref, ctaLabel, current, plans }: {
  world?: World;
  ctaHref?: (p: PlanId) => string;
  ctaLabel?: (p: PlanId) => string;
  current?: PlanId;
  plans?: Plan[];
}) {
  const tr = await getT();
  const locale = await getLocale();
  const list = plans ?? (await plansFor(world));
  const href = ctaHref ?? ((p: PlanId) => `/register?world=${world}&plan=${p}`);
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2", list.length >= 3 ? "lg:grid-cols-3" : "")}>
      {list.map((p) => {
        const id = p.id;
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
              <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wide text-white shadow-soft">{tr("MOST POPULAR")}</span>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
              {isCurrent && <span className="rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-medium text-mint-ink">{tr("Current plan")}</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{tr(p.tagline)}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className={cn("font-semibold tracking-tight text-ink", p.priceMonthlyEur === null ? "text-2xl" : "text-4xl")}>{formatPrice(p.priceMonthlyEur, locale)}</span>
              {p.priceMonthlyEur !== null && <span className="text-sm text-muted">{tr("/ month")}</span>}
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14px] text-ink">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-mist text-accent">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {tr(b)}
                </li>
              ))}
            </ul>
            {!isCurrent && (
              <Link href={href(id)} className={cn(buttonVariants({ variant: p.highlight ? "primary" : "secondary", size: "lg" }), "mt-8 w-full")}>
                {ctaLabel ? ctaLabel(id) : p.priceMonthlyEur === 0 ? tr("Start for free") : p.world === "business" ? tr("Start with {plan}", { plan: p.name }) : tr("Choose {plan}", { plan: p.name })}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
