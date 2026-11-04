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
import { cn, formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Businesses") };
}

type SP = { q?: string; plan?: string; sub?: string; status?: string };

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const db = systemDb();
  const [orgs, members, profiles, catalog] = await Promise.all([db.select("organizations", { order: { column: "created_at", ascending: false } }), db.select("organization_members", { where: { status: "active" } }), db.select("profiles"), getCatalog()]);
  const q = sp.q?.trim().toLowerCase();
  const ownerEmail = (id: string) => profiles.find((p) => p.id === id)?.email ?? "—";
  const list = orgs.filter((o) => (!q || o.name.toLowerCase().includes(q) || ownerEmail(o.owner_id).includes(q)) && (!sp.plan || o.plan === sp.plan) && (!sp.sub || o.subscription_status === sp.sub) && (!sp.status || o.status === sp.status));
  const link = (patch: Partial<SP>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v); return `/admin/businesses?${p}`; };
  const chip = (a: boolean) => cn("shrink-0 rounded-full px-3 py-1 text-[12.5px] transition", a ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Businesses")}</h1>
        <p className="text-sm text-muted">{tr("{n} company workspaces · metadata only — company content is not visible here", { n: orgs.length })}</p>
      </div>
      <form className="relative max-w-md" action="/admin/businesses">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={sp.q} placeholder={tr("Search company or owner email")} aria-label={tr("Search businesses")} className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-sky/70" />
      </form>
      <div className="flex flex-wrap gap-1.5">
        {catalog.filter((p) => p.world === "business").map((p) => <Link key={p.id} href={link({ plan: sp.plan === p.id ? undefined : p.id })} className={chip(sp.plan === p.id)}>{p.name}</Link>)}
        <span className="mx-1 w-px bg-line" />
        {(["trial", "active", "past_due", "canceled"] as const).map((s) => <Link key={s} href={link({ sub: sp.sub === s ? undefined : s })} className={chip(sp.sub === s)}>{s}</Link>)}
        <Link href={link({ status: sp.status === "suspended" ? undefined : "suspended" })} className={chip(sp.status === "suspended")}>{tr("Suspended")}</Link>
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState title={tr("No companies match")} className="m-4" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="border-b border-line bg-snow text-[12px] uppercase tracking-wider text-muted">
                <tr><th className="px-4 py-3 font-medium">{tr("Company")}</th><th className="px-4 py-3 font-medium">{tr("Plan")}</th><th className="px-4 py-3 font-medium">{tr("Subscription")}</th><th className="px-4 py-3 font-medium">{tr("Members")}</th><th className="px-4 py-3 font-medium">{tr("Created")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {list.map((o) => (
                  <tr key={o.id} className="hover:bg-snow">
                    <td className="px-4 py-3"><Link href={`/admin/businesses/${o.id}`} className="font-medium text-ink hover:text-accent-strong">{o.name}</Link><p className="text-[12px] text-muted">{ownerEmail(o.owner_id)}{o.industry ? ` · ${o.industry}` : ""}</p></td>
                    <td className="px-4 py-3 text-ink">{catalog.find((p) => p.id === o.plan)?.name ?? o.plan}</td>
                    <td className="px-4 py-3"><Badge tone={o.subscription_status === "active" ? "mint" : o.subscription_status === "trial" ? "peach" : "rose"}>{o.subscription_status}</Badge>{o.status === "suspended" && <Badge tone="rose" className="ml-1">{tr("suspended")}</Badge>}<span className="block text-[11.5px] text-muted">{o.provider}</span></td>
                    <td className="px-4 py-3 text-ink">{members.filter((m) => m.org_id === o.id).length}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(o.created_at, undefined, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
