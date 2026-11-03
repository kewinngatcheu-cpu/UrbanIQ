import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { getCatalog } from "@/lib/plans-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { cn, formatDate, relativeTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Users") };
}

type SP = { q?: string; world?: string; plan?: string; status?: string; activity?: string; sub?: string; since?: string };
const DAY = 86400000;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<SP> }) {
  const tr = await getT();
  const locale = await getLocale();
  const sp = await searchParams;
  await requireAdmin();
  const db = systemDb();
  const [profiles, subs, members, orgs, catalog] = await Promise.all([
    db.select("profiles", { order: { column: "created_at", ascending: false } }),
    db.select("subscriptions"),
    db.select("organization_members", { where: { status: "active" } }),
    db.select("organizations"),
    getCatalog(),
  ]);
  const subOf = new Map(subs.map((s) => [s.user_id, s]));
  const orgOf = new Map(members.map((m) => [m.user_id, orgs.find((o) => o.id === m.org_id)]));
  const roleOf = new Map(members.map((m) => [m.user_id, m.role]));
  const now = Date.now();
  const q = sp.q?.trim().toLowerCase();
  const effectivePlan = (p: (typeof profiles)[number]) => (p.account_type === "business" ? orgOf.get(p.id)?.plan ?? "—" : p.plan);
  const subStatus = (p: (typeof profiles)[number]) => (p.account_type === "business" ? orgOf.get(p.id)?.subscription_status ?? "none" : subOf.get(p.id)?.status ?? "none");
  const list = profiles.filter((p) =>
    (!q || p.email.includes(q) || (p.full_name ?? "").toLowerCase().includes(q) || p.id === q || (orgOf.get(p.id)?.name ?? "").toLowerCase().includes(q)) &&
    (!sp.world || (sp.world === "business" ? p.account_type === "business" : p.account_type !== "business")) &&
    (!sp.plan || effectivePlan(p) === sp.plan) &&
    (!sp.status || p.status === sp.status) &&
    (!sp.sub || subStatus(p) === sp.sub) &&
    (!sp.since || now - Date.parse(p.created_at) < Number(sp.since) * DAY) &&
    (!sp.activity || (sp.activity === "active" ? p.last_active_at && now - Date.parse(p.last_active_at) < 30 * DAY : !p.last_active_at || now - Date.parse(p.last_active_at) >= 30 * DAY)),
  );
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    return `/admin/users?${p.toString()}`;
  };
  const chip = (active: boolean) => cn("shrink-0 rounded-full px-3 py-1 text-[12.5px] transition", active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink");
  const plans = catalog.filter((p) => !sp.world || p.world === sp.world);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Users")}</h1>
        <p className="text-sm text-muted">{tr("{n} registered · account metadata only, no private content", { n: profiles.length })}</p>
      </div>
      <form className="relative max-w-md" action="/admin/users">
        {sp.world && <input type="hidden" name="world" value={sp.world} />}
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={sp.q} placeholder={tr("Search email, name, company or user id")} aria-label={tr("Search users")}
          className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-sky/70" />
      </form>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Link href={link({ world: undefined, plan: undefined })} className={chip(!sp.world)}>{tr("All")}</Link>
          <Link href={link({ world: "personal", plan: undefined })} className={chip(sp.world === "personal")}>ONE Personal</Link>
          <Link href={link({ world: "business", plan: undefined })} className={chip(sp.world === "business")}>ONE Business</Link>
          <span className="mx-1 w-px bg-line" />
          {plans.map((p) => <Link key={p.id} href={link({ plan: sp.plan === p.id ? undefined : p.id })} className={chip(sp.plan === p.id)}>{p.name}</Link>)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["active", "trial", "past_due", "canceled"] as const).map((s) => <Link key={s} href={link({ sub: sp.sub === s ? undefined : s })} className={chip(sp.sub === s)}>{tr(s === "active" ? "Subscription active" : s === "trial" ? "Trial" : s === "past_due" ? "Payment failed" : "Canceled")}</Link>)}
          <span className="mx-1 w-px bg-line" />
          {(["7", "30", "90"] as const).map((d) => <Link key={d} href={link({ since: sp.since === d ? undefined : d })} className={chip(sp.since === d)}>{tr("Registered ≤ {n} days", { n: d })}</Link>)}
          <span className="mx-1 w-px bg-line" />
          <Link href={link({ status: sp.status === "suspended" ? undefined : "suspended" })} className={chip(sp.status === "suspended")}>{tr("Suspended")}</Link>
          <Link href={link({ activity: sp.activity === "active" ? undefined : "active" })} className={chip(sp.activity === "active")}>{tr("Active 30d")}</Link>
          <Link href={link({ activity: sp.activity === "inactive" ? undefined : "inactive" })} className={chip(sp.activity === "inactive")}>{tr("Inactive")}</Link>
        </div>
      </div>
      <p className="text-[13px] text-muted">{tr(list.length === 1 ? "{n} result" : "{n} results", { n: list.length })}</p>
      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState title={tr("No users match")} className="m-4" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="border-b border-line bg-snow text-[12px] uppercase tracking-wider text-muted">
                <tr><th className="px-4 py-3 font-medium">{tr("User")}</th><th className="px-4 py-3 font-medium">{tr("World")}</th><th className="px-4 py-3 font-medium">{tr("Plan")}</th><th className="px-4 py-3 font-medium">{tr("Status")}</th><th className="px-4 py-3 font-medium">{tr("Registered")}</th><th className="px-4 py-3 font-medium">{tr("Last active")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {list.map((p) => {
                  const biz = p.account_type === "business";
                  const org = orgOf.get(p.id);
                  const plan = effectivePlan(p);
                  return (
                    <tr key={p.id} className="hover:bg-snow">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${p.id}`} className="font-medium text-ink hover:text-accent-strong">{p.full_name || p.email}</Link>
                        <p className="text-[12px] text-muted">{p.email}{p.role === "owner" && " · owner"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={biz ? "lavender" : "blue"}>{biz ? "Business" : "Personal"}</Badge>
                        {biz && org && <Link href={`/admin/businesses/${org.id}`} className="mt-1 block truncate text-[12px] text-muted hover:text-ink">{org.name} · {roleOf.get(p.id)}</Link>}
                      </td>
                      <td className="px-4 py-3"><span className="text-ink">{catalog.find((c) => c.id === plan)?.name ?? plan}</span><span className="block text-[11.5px] text-muted">{subStatus(p)}</span></td>
                      <td className="px-4 py-3">
                        <Badge tone={p.status === "active" ? "mint" : "rose"}>{p.status}</Badge>
                        {!p.email_verified && <Badge tone="peach" className="ml-1">{tr("unverified")}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-muted">{formatDate(p.created_at, undefined, locale)}</td>
                      <td className="px-4 py-3 text-muted">{p.last_active_at ? relativeTime(p.last_active_at, undefined, locale) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
