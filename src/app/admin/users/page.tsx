import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { PLANS, PLAN_ORDER } from "@/lib/config/plans";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { cn, formatDate, relativeTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Users") };
}

type SP = { q?: string; plan?: string; status?: string; activity?: string };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<SP> }) {
  const tr = await getT();
  const locale = await getLocale();
  const sp = await searchParams;
  await requireOwner();
  const db = systemDb();
  const [profiles, subs] = await Promise.all([db.select("profiles", { order: { column: "created_at", ascending: false } }), db.select("subscriptions")]);
  const subOf = new Map(subs.map((s) => [s.user_id, s]));
  const q = sp.q?.trim().toLowerCase();
  const now = Date.now();
  const list = profiles.filter((p) =>
    (!q || p.email.includes(q) || (p.full_name ?? "").toLowerCase().includes(q) || p.id === q) &&
    (!sp.plan || p.plan === sp.plan) &&
    (!sp.status || p.status === sp.status) &&
    (!sp.activity || (sp.activity === "active" ? p.last_active_at && now - Date.parse(p.last_active_at) < 30 * 86400000 : !p.last_active_at || now - Date.parse(p.last_active_at) >= 30 * 86400000)),
  );
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    return `/admin/users?${p.toString()}`;
  };
  const chip = (active: boolean) => cn("rounded-full px-3 py-1 text-[12.5px] transition", active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Users")}</h1>
        <p className="text-sm text-muted">{tr("{n} registered · account metadata only, no private content", { n: profiles.length })}</p>
      </div>
      <form className="relative max-w-md" action="/admin/users">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={sp.q} placeholder={tr("Search email, name or user id")} aria-label={tr("Search users")}
          className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-sky/70" />
      </form>
      <div className="flex flex-wrap gap-1.5">
        <Link href={link({ plan: undefined })} className={chip(!sp.plan)}>{tr("All plans")}</Link>
        {PLAN_ORDER.map((p) => <Link key={p} href={link({ plan: p })} className={chip(sp.plan === p)}>{PLANS[p].name}</Link>)}
        <span className="mx-1 w-px bg-line" />
        <Link href={link({ status: sp.status === "suspended" ? undefined : "suspended" })} className={chip(sp.status === "suspended")}>{tr("Suspended")}</Link>
        <Link href={link({ activity: sp.activity === "active" ? undefined : "active" })} className={chip(sp.activity === "active")}>{tr("Active 30d")}</Link>
        <Link href={link({ activity: sp.activity === "inactive" ? undefined : "inactive" })} className={chip(sp.activity === "inactive")}>{tr("Inactive")}</Link>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState title={tr("No users match")} className="m-4" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-line bg-snow text-[12px] uppercase tracking-wider text-muted">
                <tr><th className="px-4 py-3 font-medium">{tr("User")}</th><th className="px-4 py-3 font-medium">{tr("Plan")}</th><th className="px-4 py-3 font-medium">{tr("Status")}</th><th className="px-4 py-3 font-medium">{tr("Registered")}</th><th className="px-4 py-3 font-medium">{tr("Last active")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {list.map((p) => {
                  const s = subOf.get(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-snow">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${p.id}`} className="font-medium text-ink hover:text-accent-strong">{p.full_name || p.email}</Link>
                        <p className="text-[12px] text-muted">{p.email}{p.role === "owner" && " · owner"}</p>
                      </td>
                      <td className="px-4 py-3"><Badge tone={p.plan === "free" ? "gray" : p.plan === "premium" ? "blue" : "lavender"}>{PLANS[p.plan].name}</Badge>{s?.provider === "admin_grant" && <span className="ml-1 text-[11px] text-muted">{tr("granted")}</span>}</td>
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
