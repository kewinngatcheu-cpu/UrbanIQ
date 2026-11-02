import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/config/plans";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function UpgradeCard({ plan, title, text, className }: { plan: PlanId; title: string; text: string; className?: string }) {
  const tr = await getT();
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-sky bg-gradient-to-br from-mist via-white to-lavender/60 p-5", className)}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-soft"><Sparkles className="size-4" /></div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{text}</p>
          <Link href={`/app/settings/billing?plan=${plan}`} className={cn(buttonVariants({ size: "sm" }), "mt-3")}>{tr("Upgrade to {plan}", { plan: PLANS[plan].name })}</Link>
        </div>
      </div>
    </div>
  );
}
