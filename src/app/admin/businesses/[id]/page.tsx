import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { getCatalog } from "@/lib/plans-store";
import { getUsage, storageUsedBytes, orgSubject } from "@/lib/permissions/entitlements";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { formatBytes, formatDate, formatDateTime } from "@/lib/utils";
import { OrgAdminForms } from "../../forms";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Company") };
}

export default async function AdminBusiness({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const db = systemDb();
  const org = await db.selectOne("organizations", { id });
  if (!org) notFound();
  const [members, catalog, usage, storage, logs, counts] = await Promise.all([
    db.select("organization_members", { where: { org_id: id } }),
    getCatalog(),
    getUsage(orgSubject(org)),
    storageUsedBytes(orgSubject(org)),
    db.select("audit_logs", { where: { target_id: id }, order: { column: "created_at", ascending: false }, limit: 20 }),
    Promise.all((["memories", "documents", "tasks", "projects", "action_items", "clients"] as const).map((t) => db.count(t, { org_id: id } as never))),
  ]);
  const profiles = members.length ? await db.select("profiles", { whereIn: { column: "id", values: members.map((m) => m.user_id) } }) : [];
  const plan = catalog.find((p) => p.id === org.plan);
  return (
    <div className="space-y-6">
      <Link href="/admin/businesses" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Businesses")}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink">{org.name}</h1>
        <Badge tone={org.status === "active" ? "mint" : "rose"}>{org.status}</Badge>
        <Badge tone="lavender">{plan?.name ?? org.plan}</Badge>
        <Badge tone={org.subscription_status === "active" ? "mint" : "peach"}>{org.subscription_status}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={tr("Company")} />
            <CardBody className="grid gap-4 text-[13.5px] sm:grid-cols-2">
              {[
                ["Company ID", org.id], ["Industry", org.industry ?? "—"], ["Size", org.size ?? "—"], ["Created", formatDateTime(org.created_at, locale)],
                ["Provider", org.provider], ["Trial ends", org.trial_ends_at ? formatDate(org.trial_ends_at, undefined, locale) : "—"],
                ["Period end", org.current_period_end ? formatDate(org.current_period_end, undefined, locale) : "—"], ["AI requests (this month)", String(usage.aiRequests)],
                ["Storage used", formatBytes(storage)],
              ].map(([k, v]) => <div key={k}><p className="text-[12px] text-muted">{tr(k)}</p><p className="break-all text-ink">{v}</p></div>)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Members")} description={tr("{n} of {max} seats", { n: members.filter((m) => m.status === "active").length, max: plan?.limits.members ?? "—" })} />
            <CardBody className="divide-y divide-line/70 pt-2">
              {members.map((m) => {
                const p = profiles.find((x) => x.id === m.user_id);
                return (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13.5px]">
                    <Link href={`/admin/users/${m.user_id}`} className="min-w-0 truncate text-ink hover:text-accent-strong">{p?.full_name || p?.email || m.user_id}</Link>
                    <span className="text-muted">{m.role} · {m.status}</span>
                  </div>
                );
              })}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Usage (counts only)")} description={tr("Aggregate numbers — no content.")} />
            <CardBody className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {["Memory", "Documents", "Tasks", "Projects", "Actions", "Clients"].map((l, i) => <div key={l}><p className="text-2xl font-semibold text-ink">{counts[i]}</p><p className="text-[12px] text-muted">{tr(l)}</p></div>)}
            </CardBody>
          </Card>
          <Notice tone="blue"><Lock /> {tr("Company documents, tasks and knowledge are not accessible to the platform admin. Support access requires a logged process approved by the Business Owner.")}</Notice>
          <Card>
            <CardHeader title={tr("Audit trail")} />
            <CardBody className="pt-3">
              {logs.length === 0 ? <p className="text-sm text-muted">{tr("No entries.")}</p> : (
                <ul className="space-y-1.5 text-[13px]">{logs.map((l) => <li key={l.id} className="flex justify-between gap-3"><span className="font-mono text-[12px] text-ink">{l.action}</span><span className="shrink-0 text-muted">{formatDateTime(l.created_at, locale)}</span></li>)}</ul>
              )}
            </CardBody>
          </Card>
        </div>
        <aside><OrgAdminForms id={org.id} status={org.status} plan={org.plan} plans={catalog.filter((p) => p.world === "business").map((p) => ({ id: p.id, name: p.name }))} /></aside>
      </div>
    </div>
  );
}
