import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCatalog, plansFor } from "@/lib/plans-store";
import { currentPeriod, storageUsedBytes } from "@/lib/permissions/entitlements";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { formatBytes, formatDate, formatDateTime } from "@/lib/utils";
import { UserAdminForms } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("User") };
}

export default async function AdminUser({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ support?: string }> }) {
  const tr = await getT();
  const locale = await getLocale();
  const { id } = await params;
  const sp = await searchParams;
  const owner = await requireAdmin();
  const db = systemDb();
  const user = await db.selectOne("profiles", { id });
  if (!user) notFound();
  const [sub, usage, storage, grants, logs, counts] = await Promise.all([
    db.selectOne("subscriptions", { user_id: id }),
    db.selectOne("usage_limits", { user_id: id, period: currentPeriod() }),
    storageUsedBytes({ world: "personal", userId: id, planId: user.plan }),
    db.select("support_access_grants", { where: { user_id: id }, order: { column: "created_at", ascending: false } }),
    db.select("audit_logs", { where: { target_id: id }, order: { column: "created_at", ascending: false }, limit: 20 }),
    Promise.all((["memories", "documents", "tasks", "action_items"] as const).map((t) => db.count(t, { user_id: id }))),
  ]);
  const catalog = await getCatalog();
  const pn = (id: string) => catalog.find((p) => p.id === id)?.name ?? id;
  const memberships = await db.select("organization_members", { where: { user_id: id } });
  const orgs = memberships.length ? await db.select("organizations", { whereIn: { column: "id", values: memberships.map((m) => m.org_id) } }) : [];
  const personalPlans = (await plansFor("personal")).map((p) => ({ id: p.id, name: p.name }));
  const activeGrant = grants.find((g) => !g.revoked_at && Date.parse(g.expires_at) > Date.now());

  // Support view: only with an active, user-issued grant, and every view is logged.
  let supportItems: { title: string; created_at: string; kind: string }[] | null = null;
  if (sp.support === "1" && activeGrant) {
    const mem = (await db.select("memories", { where: { user_id: id }, order: { column: "created_at", ascending: false }, limit: 200 })).filter((m) => !m.org_id).slice(0, 50);
    supportItems = mem.map((m) => ({ title: m.title, created_at: m.created_at, kind: m.kind }));
    await audit(owner.id, "admin.support_access_used", { type: "user", id }, { grant_id: activeGrant.id, scope: "memory_titles" });
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Users")}</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink">{user.full_name || user.email}</h1>
        <Badge tone={user.status === "active" ? "mint" : "rose"}>{user.status}</Badge>
        <Badge tone={user.account_type === "business" ? "lavender" : "blue"}>{user.account_type === "business" ? "ONE Business" : `ONE Personal · ${pn(user.plan)}`}</Badge>
        {user.role === "owner" && <Badge tone="lavender">{tr("Owner")}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={tr("Account")} />
            <CardBody className="grid gap-4 text-[13.5px] sm:grid-cols-2">
              {[
                ["Email", user.email],
                ["User ID", user.id],
                ["Email verified", user.email_verified ? tr("Yes") : tr("No")],
                ["Onboarding", user.onboarding_completed ? tr("Completed") : tr("Not completed")],
                ["Registered", formatDateTime(user.created_at, locale)],
                ["Last active", user.last_active_at ? formatDateTime(user.last_active_at, locale) : "—"],
                ["Account type", user.account_type === "business" ? "ONE Business" : "ONE Personal"],
                ["Subscription", sub ? `${pn(sub.plan)} · ${sub.status} · ${sub.provider}` : "—"],
                ["Period end", sub?.current_period_end ? formatDate(sub.current_period_end, undefined, locale) : "—"],
                ["AI requests (this month)", String(usage?.ai_requests ?? 0)],
                ["Storage used", formatBytes(storage)],
              ].map(([k, v]) => (
                <div key={k}><p className="text-[12px] text-muted">{tr(k)}</p><p className="break-all text-ink">{v}</p></div>
              ))}
            </CardBody>
          </Card>
          {orgs.length > 0 && (
            <Card>
              <CardHeader title={tr("Companies")} description={tr("Memberships (metadata only)")} />
              <CardBody className="space-y-2 pt-3">
                {memberships.map((ms) => {
                  const o = orgs.find((x) => x.id === ms.org_id);
                  return o ? (
                    <Link key={ms.id} href={`/admin/businesses/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-[13.5px] hover:bg-snow">
                      <span className="truncate text-ink">{o.name}</span>
                      <span className="shrink-0 text-muted">{ms.role} · {ms.status} · {pn(o.plan)}</span>
                    </Link>
                  ) : null;
                })}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={tr("Usage (counts only)")} description={tr("Aggregate numbers — no content.")} />
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {["Memories", "Documents", "Tasks", "Actions"].map((l, i) => (
                <div key={l}><p className="text-2xl font-semibold text-ink">{counts[i]}</p><p className="text-[12px] text-muted">{l}</p></div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> {tr("Support access")}</span>} />
            <CardBody className="space-y-3">
              {activeGrant ? (
                <>
                  <Notice tone="peach">{tr("The user granted support access until {date}. Reason: “{reason}”. Every view is logged.", { date: formatDateTime(activeGrant.expires_at, locale), reason: activeGrant.reason })}</Notice>
                  {supportItems ? (
                    <ul className="divide-y divide-line/70 rounded-xl border border-line">
                      {supportItems.length === 0 && <li className="px-3 py-2 text-sm text-muted">{tr("No memories.")}</li>}
                      {supportItems.map((m, i) => (
                        <li key={i} className="flex justify-between gap-3 px-3 py-2 text-[13px]"><span className="truncate text-ink">{m.title}</span><span className="shrink-0 text-muted">{m.kind} · {formatDate(m.created_at, undefined, locale)}</span></li>
                      ))}
                    </ul>
                  ) : (
                    <Link href={`/admin/users/${id}?support=1`} className="inline-block rounded-xl bg-white px-3 py-2 text-sm font-medium text-accent-strong shadow-soft ring-1 ring-line hover:bg-snow">{tr("Open support view (logged)")}</Link>
                  )}
                </>
              ) : (
                <Notice tone="blue"><Lock /> {tr("Private content is not accessible. The user can grant time-limited support access in their privacy settings.")}</Notice>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Audit trail")} description={tr("Recent actions affecting this user")} />
            <CardBody className="pt-3">
              {logs.length === 0 ? <p className="text-sm text-muted">{tr("No entries.")}</p> : (
                <ul className="space-y-1.5 text-[13px]">
                  {logs.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3"><span className="font-mono text-[12px] text-ink">{l.action}</span><span className="text-muted">{formatDateTime(l.created_at, locale)}</span></li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
        <aside>
          {user.id === owner.id ? (
            <Notice tone="blue">{tr("This is your owner account. Role and status are managed via server configuration only.")}</Notice>
          ) : (
            <UserAdminForms id={user.id} status={user.status} plan={user.plan} plans={personalPlans} business={user.account_type === "business"} />
          )}
        </aside>
      </div>
    </div>
  );
}
