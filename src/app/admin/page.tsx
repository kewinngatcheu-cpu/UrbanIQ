import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { PLANS, PLAN_ORDER } from "@/lib/config/plans";
import { currentPeriod } from "@/lib/permissions/entitlements";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { FlaskConical } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Overview") };
}

const DAY = 86400000;

export default async function AdminOverview() {
  const tr = await getT();
  await requireOwner();
  const db = systemDb();
  const [profiles, subs, usage, feedback, checkouts] = await Promise.all([
    db.select("profiles"),
    db.select("subscriptions"),
    db.select("usage_limits", { where: { period: currentPeriod() } }),
    db.select("feedback", { where: { status: "new" } }),
    db.select("billing_checkouts"),
  ]);
  const now = Date.now();
  const byPlan = Object.fromEntries(PLAN_ORDER.map((p) => [p, profiles.filter((u) => u.plan === p).length]));
  const new7 = profiles.filter((p) => now - Date.parse(p.created_at) < 7 * DAY).length;
  const new30 = profiles.filter((p) => now - Date.parse(p.created_at) < 30 * DAY).length;
  const active30 = profiles.filter((p) => p.last_active_at && now - Date.parse(p.last_active_at) < 30 * DAY).length;
  const paidSubs = subs.filter((s) => s.plan !== "free" && s.status === "active");
  const cancellations30 = subs.filter((s) => s.canceled_at && now - Date.parse(s.canceled_at) < 30 * DAY).length;
  const realRevenueSubs = paidSubs.filter((s) => s.provider === "stripe");
  const mrr = realRevenueSubs.reduce((sum, s) => sum + s.price_monthly_eur, 0);
  const aiRequests = usage.reduce((s, u) => s + u.ai_requests, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY).toISOString().slice(0, 10);
    return { d, n: profiles.filter((p) => p.created_at.slice(0, 10) === d).length };
  });
  const maxDay = Math.max(1, ...days.map((x) => x.n));

  const stat = (label: string, value: string | number, hint?: string) => (
    <Card><CardBody>
      <p className="text-[12.5px] text-muted">{tr(label)}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </CardBody></Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Overview")}</h1>
        <p className="text-sm text-muted">{tr("Aggregated platform metrics. Private user content is never shown here.")}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat("Registered users", profiles.length, tr("{a} new in 7 days · {b} in 30 days", { a: new7, b: new30 }))}
        {stat("Active users (30d)", active30, tr("{n} inactive", { n: profiles.length - active30 }))}
        {stat("Paid subscriptions", paidSubs.length, tr("{n} cancellations in 30 days", { n: cancellations30 }))}
        {stat("AI requests this month", aiRequests, env.aiMode === "demo" ? tr("AI in demo mode") : env.aiModel)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={tr("New registrations")} description={tr("Last 14 days")} />
          <CardBody>
            <div className="flex h-40 items-end gap-1.5" role="img" aria-label={tr("Registrations per day for the last 14 days")}>
              {days.map((x) => (
                <div key={x.d} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100">{x.n}</span>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-primary to-cloud" style={{ height: `${(x.n / maxDay) * 120 + 2}px` }} />
                  <span className="text-[10px] text-muted">{x.d.slice(8)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("Memberships")} />
          <CardBody className="space-y-3">
            {PLAN_ORDER.map((p) => (
              <div key={p} className="flex items-center justify-between">
                <Badge tone={p === "free" ? "gray" : p === "premium" ? "blue" : "lavender"}>{PLANS[p].name}</Badge>
                <span className="text-lg font-semibold text-ink">{byPlan[p]}</span>
              </div>
            ))}
            <Link href="/admin/users" className="block pt-2 text-[13px] font-medium text-accent-strong hover:underline">{tr("Manage users")}</Link>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={tr("Revenue (MRR)")} />
          <CardBody>
            {realRevenueSubs.length ? (
              <p className="text-3xl font-semibold text-ink">€{mrr.toFixed(2)}</p>
            ) : (
              <Notice tone="lavender"><FlaskConical /> {tr("No real payment data.")} {env.billingMode === "demo" ? tr("Billing is in demo mode ({n} demo checkouts, excluded from revenue).", { n: checkouts.filter((c) => c.status === "paid").length }) : tr("No Stripe subscriptions yet.")}</Notice>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("Feedback")} />
          <CardBody>
            <p className="text-3xl font-semibold text-ink">{feedback.length}</p>
            <p className="text-[12.5px] text-muted">{tr("new items waiting")}</p>
            <Link href="/admin/feedback" className="mt-2 block text-[13px] font-medium text-accent-strong hover:underline">{tr("Review feedback")}</Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("System")} />
          <CardBody className="space-y-2 text-[13px]">
            <p className="flex justify-between"><span className="text-muted">{tr("Database")}</span><Badge tone={env.backend === "supabase" ? "mint" : "peach"}>{env.backend === "supabase" ? tr("Supabase") : tr("Local demo store")}</Badge></p>
            <p className="flex justify-between"><span className="text-muted">{tr("AI")}</span><Badge tone={env.aiMode === "anthropic" ? "mint" : "lavender"}>{env.aiMode === "anthropic" ? tr("Connected") : tr("Demo mode")}</Badge></p>
            <p className="flex justify-between"><span className="text-muted">{tr("Billing")}</span><Badge tone={env.billingMode === "stripe" ? "mint" : "lavender"}>{env.billingMode}</Badge></p>
            <Link href="/admin/system" className="block pt-1 font-medium text-accent-strong hover:underline">{tr("System status")}</Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
