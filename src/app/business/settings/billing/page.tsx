import type { Metadata } from "next";
import { FlaskConical, Info, CreditCard, Clock } from "lucide-react";
import { requireOrg } from "@/lib/org";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { getT, getLocale } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/config/plans";
import { plansFor } from "@/lib/plans-store";
import { getUsage, storageUsedBytes, orgSubject } from "@/lib/permissions/entitlements";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { PlanCards } from "@/components/landing/plan-cards";
import { BizCheckout } from "@/components/business/settings-ui";
import { cancelBusinessPlan } from "../../_actions/team";
import { formatBytes, formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Plan & billing") };
}

export default async function BizBilling({ searchParams }: { searchParams: Promise<{ plan?: string; checkout?: string; error?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const tr = await getT();
  const locale = await getLocale();
  const plans = await plansFor("business");
  const plan = ctx.ent.plan;
  const subject = orgSubject(ctx.org);
  const [usage, storage, seats, projects] = await Promise.all([
    getUsage(subject), storageUsedBytes(subject),
    systemDb().count("organization_members", { org_id: ctx.org.id, status: "active" }),
    ctx.db.count("projects", { status: "active" }),
  ]);
  const owner = ctx.can("org.billing");
  const target = owner ? plans.find((p) => p.id === sp.plan && p.priceMonthlyEur !== null && p.priceMonthlyEur > 0) : undefined;
  const o = ctx.org;
  const paid = o.subscription_status === "active" && o.provider !== "none";
  return (
    <div className="space-y-6">
      {env.billingMode === "demo" && <Notice tone="lavender"><FlaskConical /> {tr("Billing runs in demo mode — no real payments are processed.")}</Notice>}
      {sp.checkout === "canceled" && <Notice tone="blue"><Info /> {tr("Checkout was canceled — nothing was charged.")}</Notice>}
      {sp.error && <Notice tone="rose"><Info /> {sp.error.slice(0, 200)}</Notice>}
      <Card>
        <CardHeader title={<span className="flex flex-wrap items-center gap-2">{tr("Company plan:")} {plan.name} <Badge tone={o.subscription_status === "trial" ? "peach" : o.subscription_status === "active" ? "mint" : "rose"}>{tr(o.subscription_status === "trial" ? "Trial" : o.subscription_status === "active" ? "Active" : o.subscription_status === "past_due" ? "Payment failed" : "Canceled")}</Badge></span>}
          description={o.subscription_status === "trial" && o.trial_ends_at ? tr("Trial ends on {date}", { date: formatDate(o.trial_ends_at, undefined, locale) }) : o.current_period_end ? tr("Renews on {date}", { date: formatDate(o.current_period_end, undefined, locale) }) : tr(plan.tagline)} />
        <CardBody className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["Users", seats, plan.limits.members, String(seats), String(plan.limits.members)],
            ["Projects", projects, plan.limits.projects, String(projects), String(plan.limits.projects)],
            ["AI requests this month", usage.aiRequests, plan.limits.aiRequestsPerMonth, String(usage.aiRequests), plan.limits.aiRequestsPerMonth.toLocaleString()],
            ["Storage", storage, plan.limits.storageMb * 1024 * 1024, formatBytes(storage), `${plan.limits.storageMb >= 1000 ? `${plan.limits.storageMb / 1000} GB` : `${plan.limits.storageMb} MB`}`],
          ] as const).map(([label, v, max, vs, ms]) => (
            <div key={label}>
              <div className="flex justify-between gap-2 text-[13px]"><span className="text-muted">{tr(label)}</span><span className="font-medium text-ink">{vs} / {ms}</span></div>
              <Progress value={(v / Math.max(1, max)) * 100} className="mt-2" />
            </div>
          ))}
        </CardBody>
        {owner && (paid || o.stripe_customer_id) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
            {env.billingMode === "stripe" && o.stripe_customer_id && (
              <form action="/api/billing/portal" method="post"><input type="hidden" name="scope" value="org" /><button className={buttonVariants({ variant: "secondary", size: "sm" })}><CreditCard /> {tr("Manage billing & invoices")}</button></form>
            )}
            {paid && <ConfirmAction action={cancelBusinessPlan} trigger={tr("Cancel company plan")} triggerVariant="ghost" danger title={tr("Cancel {plan}?", { plan: plan.name })} description={tr("Company data stays. Without an active plan, the workspace becomes read-only.")} confirmLabel={tr("Cancel plan")} />}
          </div>
        )}
      </Card>
      {!owner && <Notice tone="blue"><Info /> {tr("Only the Business Owner can change the company plan.")}</Notice>}
      {plans.some((p) => p.priceMonthlyEur === null) && <Notice tone="blue"><Clock /> {tr("Prices for ONE Business plans are being finalised. You can use your trial in full in the meantime — we'll let you know before anything is charged.")}</Notice>}
      <div>
        <h2 className="mb-4 text-[15px] font-semibold text-ink">{tr("Business plans")}</h2>
        <PlanCards world="business" plans={plans} current={plan.id}
          ctaHref={(p) => (owner && (plans.find((x) => x.id === p)?.priceMonthlyEur ?? 0) > 0 ? `/business/settings/billing?plan=${p}#upgrade` : "#")}
          ctaLabel={(p) => { const t = plans.find((x) => x.id === p)!; return t.priceMonthlyEur === null ? tr("Price coming soon") : tr("Choose {plan}", { plan: t.name }); }} />
      </div>
      {target && target.id !== plan.id || (target && !paid) ? (
        <div id="upgrade" className="scroll-mt-24"><BizCheckout plan={target!.id} planName={target!.name} price={formatPrice(target!.priceMonthlyEur, locale)} /></div>
      ) : null}
    </div>
  );
}
