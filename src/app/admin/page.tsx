import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, User, Building2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { formatPrice } from "@/lib/config/plans";
import { platformMetrics, registrationsByDay } from "@/lib/admin-metrics";
import { getFlags } from "@/lib/features";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { Bars, Stat } from "@/components/admin/bars";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Overview") };
}

export default async function AdminOverview() {
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const m = await platformMetrics();
  const [feedback, requests, flags, checkouts] = await Promise.all([
    systemDb().count("feedback", { status: "new" }),
    systemDb().count("account_type_requests", { status: "pending" }),
    getFlags(),
    systemDb().select("billing_checkouts", { where: { status: "paid" } }),
  ]);
  const c = m.counts;
  const eur = (n: number) => formatPrice(Math.round(n * 100) / 100, locale);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Platform overview")}</h1>
        <p className="text-sm text-muted">{tr("ONE Personal and ONE Business at a glance. Aggregated metadata only — private and company content is never shown here.")}</p>
      </div>
      {flags.maintenance_mode && <Notice tone="peach">{tr("Maintenance mode is ON — users can read but not change data.")} <Link href="/admin/features" className="font-medium underline">{tr("Change")}</Link></Notice>}
      {(requests > 0 || feedback > 0) && (
        <div className="flex flex-wrap gap-2">
          {requests > 0 && <Link href="/admin/requests"><Badge tone="peach">{tr("{n} account type requests waiting", { n: requests })}</Badge></Link>}
          {feedback > 0 && <Link href="/admin/feedback"><Badge tone="blue">{tr("{n} new feedback items", { n: feedback })}</Badge></Link>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={tr("Total users")} value={c.users} hint={tr("{a} new in 7 days · {b} in 30 days", { a: c.new7, b: c.new30 })} />
        <Stat label={tr("ONE Personal users")} value={c.personal} hint={tr("{n} paying", { n: c.personalPaid })} />
        <Stat label={tr("ONE Business users")} value={c.business} hint={tr("{n} companies", { n: c.orgs })} />
        <Stat label={tr("Active users (30d)")} value={c.active30} hint={tr("{n} inactive", { n: c.users - c.active30 })} />
        <Stat label={tr("Active subscriptions")} value={c.personalPaid + c.orgPaid} hint={tr("{a} personal · {b} business", { a: c.personalPaid, b: c.orgPaid })} />
        <Stat label={tr("Companies in trial")} value={c.orgsTrial} hint={c.orgsSuspended ? tr("{n} suspended", { n: c.orgsSuspended }) : undefined} />
        <Stat label={tr("Up- / downgrades (30d)")} value={`${c.upgrades} / ${c.downgrades}`} hint={tr("from the audited plan changes")} />
        <Stat label={tr("Cancellations (30d)")} value={c.cancellations30} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={tr("New registrations")} description={tr("Last 14 days · Personal and Business")} />
          <CardBody className="grid gap-6 sm:grid-cols-2">
            <div className="min-w-0"><p className="mb-2 flex items-center gap-1.5 text-[12.5px] text-muted"><User className="size-3.5" /> ONE Personal</p><Bars data={registrationsByDay(m.personal, 14)} label={tr("Personal registrations per day")} /></div>
            <div className="min-w-0"><p className="mb-2 flex items-center gap-1.5 text-[12.5px] text-muted"><Building2 className="size-3.5" /> ONE Business</p><Bars data={registrationsByDay(m.business, 14)} label={tr("Business registrations per day")} tone="from-ink to-muted" /></div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("Revenue (MRR)")} description={tr("Only real Stripe subscriptions")} />
          <CardBody className="space-y-3">
            {m.revenue.real ? (
              <>
                <p className="text-3xl font-semibold text-ink">{eur(m.revenue.mrr)}</p>
                <p className="text-[13px] text-muted">{tr("Personal {a} · Business {b}", { a: eur(m.revenue.mrrPersonal), b: eur(m.revenue.mrrBusiness) })}</p>
              </>
            ) : (
              <Notice tone="lavender"><FlaskConical /> {tr("No real payment data yet.")} {env.billingMode === "demo" ? tr("Billing is in demo mode ({n} demo checkouts, excluded from revenue).", { n: checkouts.length }) : tr("No Stripe subscriptions yet.")}</Notice>
            )}
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title={tr("ONE Personal plans")} />
          <CardBody className="space-y-2.5">
            {m.catalog.filter((p) => p.world === "personal").map((p) => (
              <div key={p.id} className="flex items-center justify-between"><span className="text-[13.5px] text-ink">{p.name}{!p.active && <span className="text-muted"> · {tr("inactive")}</span>}</span><span className="text-lg font-semibold text-ink">{m.personalByPlan[p.id] ?? 0}</span></div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("ONE Business plans")} description={tr("Companies per plan")} />
          <CardBody className="space-y-2.5">
            {m.catalog.filter((p) => p.world === "business").map((p) => (
              <div key={p.id} className="flex items-center justify-between"><span className="text-[13.5px] text-ink">{p.name}</span><span className="text-lg font-semibold text-ink">{m.orgByPlan[p.id] ?? 0}</span></div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("System")} />
          <CardBody className="space-y-2 text-[13px]">
            <p className="flex justify-between"><span className="text-muted">{tr("Database")}</span><Badge tone={env.backend === "supabase" ? "mint" : "peach"}>{env.backend === "supabase" ? "Supabase" : tr("Local demo store")}</Badge></p>
            <p className="flex justify-between"><span className="text-muted">{tr("AI")}</span><Badge tone={env.aiMode === "anthropic" ? "mint" : "lavender"}>{env.aiMode === "anthropic" ? tr("Connected") : tr("Demo mode")}</Badge></p>
            <p className="flex justify-between"><span className="text-muted">{tr("Billing")}</span><Badge tone={env.billingMode === "stripe" ? "mint" : "lavender"}>{env.billingMode}</Badge></p>
            <p className="flex justify-between"><span className="text-muted">{tr("Maintenance")}</span><Badge tone={flags.maintenance_mode ? "peach" : "mint"}>{flags.maintenance_mode ? tr("On") : tr("Off")}</Badge></p>
            <Link href="/admin/system" className="block pt-1 font-medium text-accent-strong hover:underline">{tr("System status")}</Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
