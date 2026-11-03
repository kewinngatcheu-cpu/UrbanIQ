import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { FlaskConical, Info, CreditCard } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { formatPrice } from "@/lib/config/plans";
import { plansFor } from "@/lib/plans-store";
import { getUsage, storageUsedBytes, personalSubject } from "@/lib/permissions/entitlements";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm";
import { PlanCards } from "@/components/landing/plan-cards";
import { cancelPlan } from "../../_actions/settings";
import { formatBytes, formatDate } from "@/lib/utils";
import { UpgradeButtons } from "./upgrade";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Plan & billing") };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ plan?: string; checkout?: string; error?: string }> }) {
  const tr = await getT();
  const locale = await getLocale();
  const sp = await searchParams;
  const user = await requireUser();
  const sub = await systemDb().selectOne("subscriptions", { user_id: user.id });
  const usage = await getUsage(personalSubject(user));
  const storage = await storageUsedBytes(personalSubject(user));
  const memCount = await systemDb().count("memories", { user_id: user.id });
  const plans = await plansFor("personal");
  const all = await plansFor("personal", { includeInactive: true });
  const plan = all.find((p) => p.id === user.plan) ?? all[0];
  const target = plans.find((p) => p.id === sp.plan && p.priceMonthlyEur !== null);
  const highlight = target?.id;

  return (
    <div className="space-y-6">
      {env.billingMode === "demo" && (
        <Notice tone="lavender"><FlaskConical /> {tr("Billing runs in demo mode — no real payments are processed. Plans activate only after a server-side confirmed (demo) checkout.")}</Notice>
      )}
      {sp.checkout === "canceled" && <Notice tone="blue"><Info /> {tr("Checkout was canceled — nothing was charged.")}</Notice>}
      {sp.error && <Notice tone="rose"><Info /> {sp.error.slice(0, 200)}</Notice>}
      {sub?.status === "past_due" && <Notice tone="peach"><Info /> {tr("Your last payment failed. Please update your payment method to keep {plan}.", { plan: plan.name })}</Notice>}
      {sub?.cancel_at_period_end && sub.current_period_end && (
        <Notice tone="peach"><Info /> {tr("Your {plan} plan ends on {date}. You can resume it in “Manage billing”.", { plan: plan.name, date: formatDate(sub.current_period_end, undefined, locale) })}</Notice>
      )}
      <Card>
        <CardHeader title={<span className="flex items-center gap-2">{tr("Your plan:")} {plan.name} <Badge tone={plan.priceMonthlyEur ? "blue" : "gray"}>{formatPrice(plan.priceMonthlyEur, locale)}{plan.priceMonthlyEur ? tr("/mo") : ""}</Badge></span>}
          description={sub?.current_period_end ? `${tr("Renews on {date}", { date: formatDate(sub.current_period_end, undefined, locale) })}${sub.provider === "admin_grant" ? ` · ${tr("complimentary")}` : sub.provider === "demo" ? ` · ${tr("demo billing")}` : ""}` : tr(plan.tagline)} />
        <CardBody className="grid gap-5 sm:grid-cols-3">
          {[
            ["AI requests this month", usage.aiRequests, plan.limits.aiRequestsPerMonth, String(usage.aiRequests), String(plan.limits.aiRequestsPerMonth)],
            ["Storage", storage, plan.limits.storageMb * 1024 * 1024, formatBytes(storage), `${plan.limits.storageMb >= 1000 ? `${plan.limits.storageMb / 1000} GB` : `${plan.limits.storageMb} MB`}`],
            ["Memories", memCount, plan.limits.memories, String(memCount), plan.limits.memories.toLocaleString()],
          ].map(([label, v, max, vs, ms]) => (
            <div key={label as string}>
              <div className="flex justify-between text-[13px]"><span className="text-muted">{tr(label as string)}</span><span className="font-medium text-ink">{vs as string} / {ms as string}</span></div>
              <Progress value={((v as number) / (max as number)) * 100} className="mt-2" />
            </div>
          ))}
        </CardBody>
        {(sub?.stripe_customer_id || !!plan.priceMonthlyEur) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
            {env.billingMode === "stripe" && sub?.stripe_customer_id && (
              <form action="/api/billing/portal" method="post">
                <button className={buttonVariants({ variant: "secondary", size: "sm" })}><CreditCard /> {tr("Manage billing & invoices")}</button>
              </form>
            )}
            {!!plan.priceMonthlyEur && !sub?.cancel_at_period_end && <ConfirmAction action={cancelPlan} trigger={tr("Cancel plan")} triggerVariant="ghost" danger title={tr("Cancel {plan}?", { plan: plan.name })}
              description={sub?.provider === "stripe" ? tr("Your plan stays active until the end of the paid period, then you move to Free. Your data stays.") : tr("You'll move to Free right away. Your data stays — but features and limits of Free apply.")} confirmLabel={tr("Cancel plan")} />}
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-4 text-[15px] font-semibold text-ink">{tr("Compare plans")}</h2>
        <PlanCards plans={plans} current={user.plan} ctaHref={(p) => `/app/settings/billing?plan=${p}#upgrade`} ctaLabel={(p) => {
          const t = plans.find((x) => x.id === p)!;
          if (t.priceMonthlyEur === 0) return tr("Switch to {plan}", { plan: t.name });
          return (t.priceMonthlyEur ?? 0) > (plan.priceMonthlyEur ?? 0) ? tr("Upgrade to {plan}", { plan: t.name }) : tr("Switch to {plan}", { plan: t.name });
        }} />
      </div>
      {highlight && highlight !== user.plan && (
        <div id="upgrade" className="scroll-mt-24">
          <UpgradeButtons plan={highlight} free={target!.priceMonthlyEur === 0} planName={target!.name} price={formatPrice(target!.priceMonthlyEur, locale)} />
        </div>
      )}
    </div>
  );
}
