import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { FlaskConical, Info } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { formatPrice } from "@/lib/config/plans";
import { platformMetrics, registrationsByDay } from "@/lib/admin-metrics";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice, Progress } from "@/components/ui/misc";
import { Bars, Stat } from "@/components/admin/bars";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Analytics") };
}

const DAY = 86400000;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10} %` : "—");

export default async function AdminAnalytics() {
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const m = await platformMetrics();
  const db = systemDb();
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  // Module usage: counts of items created in the last 30 days (no content is read).
  const tables = ["memories", "documents", "tasks", "action_items", "projects", "ai_messages"] as const;
  const rows = await Promise.all(tables.map((t) => db.select(t, { limit: 20000 })));
  const usage = tables.map((t, i) => {
    const recent = (rows[i] as { created_at: string; org_id?: string | null }[]).filter((r) => r.created_at >= since);
    return { t, personal: recent.filter((r) => !r.org_id).length, business: recent.filter((r) => !!r.org_id).length };
  });
  const LABEL: Record<(typeof tables)[number], string> = { memories: "Memory entries", documents: "Documents uploaded", tasks: "Tasks", action_items: "Actions", projects: "Projects", ai_messages: "AI messages" };
  const c = m.counts;
  const paying = c.personalPaid + c.orgPaid;
  const accounts = c.personal + c.orgs;
  const arpa = m.revenue.real ? m.revenue.mrr / Math.max(1, m.revenue.payingAccounts) : null;
  const maxUsage = Math.max(1, ...usage.map((u) => u.personal + u.business));
  const tooFew = m.counts.users < 20;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Analytics")}</h1>
        <p className="text-sm text-muted">{tr("Computed live from the platform's own data — aggregated counts only.")}</p>
      </div>
      {env.backend === "local" && <Notice tone="lavender"><FlaskConical /> {tr("Local demo store: these numbers come from test and demo accounts, not real customers.")}</Notice>}
      {tooFew && <Notice tone="blue"><Info /> {tr("Fewer than 20 users — percentages are not meaningful yet.")}</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={tr("Conversion to paid")} value={pct(paying, accounts)} hint={tr("{a} paying of {b} accounts (incl. demo/grants)", { a: paying, b: accounts })} />
        <Stat label={tr("Churn (30d)")} value={pct(c.cancellations30, paying + c.cancellations30)} hint={tr("{n} cancellations", { n: c.cancellations30 })} />
        <Stat label={tr("ARPA (Stripe)")} value={arpa === null ? "—" : formatPrice(Math.round(arpa * 100) / 100, locale)} hint={arpa === null ? tr("No real payment data") : tr("per paying account / month")} />
        <Stat label={tr("Active users (30d)")} value={pct(c.active30, c.users)} hint={tr("{a} of {b}", { a: c.active30, b: c.users })} />
      </div>
      <Card>
        <CardHeader title={tr("Registrations")} description={tr("Last 30 days")} />
        <CardBody className="grid gap-6 md:grid-cols-2">
          <div className="min-w-0"><p className="mb-2 text-[12.5px] text-muted">ONE Personal · {m.personal.filter((p) => p.created_at >= since).length}</p><Bars data={registrationsByDay(m.personal, 30)} label={tr("Personal registrations per day")} /></div>
          <div className="min-w-0"><p className="mb-2 text-[12.5px] text-muted">ONE Business · {m.business.filter((p) => p.created_at >= since).length}</p><Bars data={registrationsByDay(m.business, 30)} label={tr("Business registrations per day")} tone="from-ink to-muted" /></div>
        </CardBody>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={tr("Plan distribution")} />
          <CardBody className="space-y-3">
            {m.catalog.map((p) => {
              const n = p.world === "personal" ? m.personalByPlan[p.id] ?? 0 : m.orgByPlan[p.id] ?? 0;
              const total = p.world === "personal" ? c.personal : c.orgs;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-[13px]"><span className="text-ink">{p.name} <span className="text-muted">· {p.world}</span></span><span className="text-muted">{n} · {pct(n, total)}</span></div>
                  <Progress value={total ? (n / total) * 100 : 0} className="mt-1.5" />
                </div>
              );
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("Module usage")} description={tr("Items created in the last 30 days")} />
          <CardBody className="space-y-3">
            {usage.map((u) => (
              <div key={u.t}>
                <div className="flex justify-between text-[13px]"><span className="text-ink">{tr(LABEL[u.t])}</span><span className="text-muted">{tr("{a} personal · {b} business", { a: u.personal, b: u.business })}</span></div>
                <Progress value={((u.personal + u.business) / maxUsage) * 100} className="mt-1.5" />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
