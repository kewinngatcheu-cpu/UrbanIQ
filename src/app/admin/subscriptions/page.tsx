import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { env } from "@/lib/config/env";
import { formatPrice } from "@/lib/config/plans";
import { platformMetrics, planName } from "@/lib/admin-metrics";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { Stat } from "@/components/admin/bars";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Subscriptions") };
}

export default async function AdminSubscriptions({ searchParams }: { searchParams: Promise<{ world?: string }> }) {
  const sp = await searchParams;
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const m = await platformMetrics();
  const email = (id: string) => m.profiles.find((p) => p.id === id)?.email ?? id;
  const personal = m.subs.filter((s) => s.provider !== "none" || s.status !== "active").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const business = [...m.orgs].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const changes = m.auditRows.filter((a) => a.action.startsWith("subscription.")).slice(0, 40);
  const world = sp.world === "business" ? "business" : sp.world === "personal" ? "personal" : null;
  const chip = (a: boolean) => cn("rounded-full px-3 py-1 text-[12.5px]", a ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink");
  const tone = (s: string) => (s === "active" ? "mint" : s === "trial" ? "peach" : s === "past_due" ? "rose" : "gray");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Subscriptions")}</h1>
        <p className="text-sm text-muted">{tr("Personal memberships and company plans. Revenue only counts real Stripe subscriptions.")}</p>
      </div>
      {env.billingMode === "demo" && <Notice tone="lavender"><FlaskConical /> {tr("Billing is in demo mode — demo checkouts and admin grants are shown but never counted as revenue.")}</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={tr("Paying accounts (Stripe)")} value={m.revenue.payingAccounts} />
        <Stat label={tr("MRR (Stripe)")} value={m.revenue.real ? formatPrice(Math.round(m.revenue.mrr * 100) / 100, locale) : "—"} hint={m.revenue.real ? undefined : tr("No real payment data")} />
        <Stat label={tr("Up- / downgrades (30d)")} value={`${m.counts.upgrades} / ${m.counts.downgrades}`} />
        <Stat label={tr("Cancellations (30d)")} value={m.counts.cancellations30} />
      </div>
      <div className="flex gap-1.5">
        <Link href="/admin/subscriptions" className={chip(!world)}>{tr("All")}</Link>
        <Link href="/admin/subscriptions?world=personal" className={chip(world === "personal")}>ONE Personal</Link>
        <Link href="/admin/subscriptions?world=business" className={chip(world === "business")}>ONE Business</Link>
      </div>
      {world !== "business" && (
        <Card className="overflow-hidden">
          <CardHeader title="ONE Personal" description={tr("{n} memberships (paid, granted or ended)", { n: personal.length })} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead className="border-y border-line bg-snow text-[12px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-2.5 font-medium">{tr("User")}</th><th className="px-4 py-2.5 font-medium">{tr("Plan")}</th><th className="px-4 py-2.5 font-medium">{tr("Status")}</th><th className="px-4 py-2.5 font-medium">{tr("Provider")}</th><th className="px-4 py-2.5 font-medium">{tr("Period end")}</th></tr></thead>
              <tbody className="divide-y divide-line/70">
                {personal.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">{tr("No entries.")}</td></tr>}
                {personal.map((s) => (
                  <tr key={s.id}><td className="px-4 py-2.5"><Link href={`/admin/users/${s.user_id}`} className="text-ink hover:text-accent-strong">{email(s.user_id)}</Link></td><td className="px-4 py-2.5">{planName(m.catalog, s.plan)}</td><td className="px-4 py-2.5"><Badge tone={tone(s.status)}>{s.status}{s.cancel_at_period_end ? " · ends" : ""}</Badge></td><td className="px-4 py-2.5 text-muted">{s.provider}</td><td className="px-4 py-2.5 text-muted">{s.current_period_end ? formatDate(s.current_period_end, undefined, locale) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {world !== "personal" && (
        <Card className="overflow-hidden">
          <CardHeader title="ONE Business" description={tr("{n} companies", { n: business.length })} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead className="border-y border-line bg-snow text-[12px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-2.5 font-medium">{tr("Company")}</th><th className="px-4 py-2.5 font-medium">{tr("Plan")}</th><th className="px-4 py-2.5 font-medium">{tr("Status")}</th><th className="px-4 py-2.5 font-medium">{tr("Provider")}</th><th className="px-4 py-2.5 font-medium">{tr("Trial / period end")}</th></tr></thead>
              <tbody className="divide-y divide-line/70">
                {business.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">{tr("No entries.")}</td></tr>}
                {business.map((o) => (
                  <tr key={o.id}><td className="px-4 py-2.5"><Link href={`/admin/businesses/${o.id}`} className="text-ink hover:text-accent-strong">{o.name}</Link></td><td className="px-4 py-2.5">{planName(m.catalog, o.plan)}</td><td className="px-4 py-2.5"><Badge tone={tone(o.subscription_status)}>{o.subscription_status}</Badge></td><td className="px-4 py-2.5 text-muted">{o.provider}</td><td className="px-4 py-2.5 text-muted">{(o.subscription_status === "trial" ? o.trial_ends_at : o.current_period_end) ? formatDate((o.subscription_status === "trial" ? o.trial_ends_at : o.current_period_end)!, undefined, locale) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card>
        <CardHeader title={tr("Recent subscription events")} description={tr("From the audit log")} />
        <CardBody className="pt-3">
          {changes.length === 0 ? <p className="text-sm text-muted">{tr("No entries.")}</p> : (
            <ul className="space-y-1.5 text-[13px]">
              {changes.map((c) => {
                const d = c.details as { plan?: string; previous?: string; world?: string };
                return <li key={c.id} className="flex flex-wrap justify-between gap-x-3"><span className="font-mono text-[12px] text-ink">{c.action}{d.previous || d.plan ? ` · ${d.previous ?? "—"} → ${d.plan ?? "—"}` : ""}{d.world === "business" ? " · business" : ""}</span><span className="text-muted">{formatDateTime(c.created_at, locale)}</span></li>;
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
