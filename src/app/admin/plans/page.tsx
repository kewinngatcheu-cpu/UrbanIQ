import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Info } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { getCatalog } from "@/lib/plans-store";
import { BUSINESS_FEATURES, PERSONAL_FEATURES, formatPrice } from "@/lib/config/plans";
import { env } from "@/lib/config/env";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { PlanEditor, NewPlanForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Plans & prices") };
}

export default async function AdminPlans() {
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const catalog = await getCatalog();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Plans & prices")}</h1>
        <p className="text-sm text-muted">{tr("Central plan management for both worlds. Prices, limits and features apply immediately and are enforced on the server. Every change is logged.")}</p>
      </div>
      <Notice tone="blue"><Info /> {env.billingMode === "stripe" ? tr("Stripe mode: a plan is only purchasable when its price is set here AND a matching STRIPE_PRICE_<ID> exists. Changing a price here does not change existing Stripe prices.") : tr("Demo billing: plans with a price can be booked with the demo checkout. Plans without a price show “Price coming soon” and cannot be booked.")}</Notice>
      {(["personal", "business"] as const).map((world) => (
        <section key={world} className="space-y-4">
          <h2 className="text-[17px] font-semibold text-ink">{world === "personal" ? "ONE Personal" : "ONE Business"}</h2>
          {catalog.filter((p) => p.world === world).map((p) => (
            <Card key={p.id}>
              <CardHeader title={<span className="flex flex-wrap items-center gap-2">{p.name} <Badge tone={p.active ? "mint" : "gray"}>{p.active ? tr("active") : tr("inactive")}</Badge>{p.custom && <Badge tone="lavender">{tr("custom")}</Badge>}<span className="font-mono text-[12px] font-normal text-muted">{p.id}</span></span>}
                description={formatPrice(p.priceMonthlyEur, locale)} />
              <CardBody><details><summary className="cursor-pointer text-[13px] font-medium text-accent-strong">{tr("Edit plan")}</summary><div className="mt-4"><PlanEditor plan={p} featureKeys={world === "business" ? BUSINESS_FEATURES : PERSONAL_FEATURES} /></div></details></CardBody>
            </Card>
          ))}
        </section>
      ))}
      <Card>
        <CardHeader title={tr("New plan")} description={tr("New plans start inactive and without a price.")} />
        <CardBody><NewPlanForm /></CardBody>
      </Card>
    </div>
  );
}
