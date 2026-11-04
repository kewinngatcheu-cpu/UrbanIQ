import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";
import { RequestDecision } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Requests") };
}

export default async function AdminRequests() {
  const tr = await getT();
  const locale = await getLocale();
  await requireAdmin();
  const db = systemDb();
  const reqs = await db.select("account_type_requests", { order: { column: "created_at", ascending: false }, limit: 200 });
  const profiles = reqs.length ? await db.select("profiles", { whereIn: { column: "id", values: [...new Set(reqs.map((r) => r.user_id))] } }) : [];
  const pending = reqs.filter((r) => r.status === "pending");
  const done = reqs.filter((r) => r.status !== "pending").slice(0, 50);
  const who = (id: string) => profiles.find((p) => p.id === id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Account type requests")}</h1>
        <p className="text-sm text-muted">{tr("Switching between ONE Personal and ONE Business only happens through this controlled process. Data is never moved between worlds.")}</p>
      </div>
      <Card>
        <CardHeader title={tr("Waiting for a decision")} description={tr("{n} open", { n: pending.length })} />
        <CardBody className="divide-y divide-line/70 pt-2">
          {pending.length === 0 ? <EmptyState title={tr("No open requests")} /> : pending.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-1 text-[13.5px]">
                <p className="flex flex-wrap items-center gap-2"><Link href={`/admin/users/${r.user_id}`} className="font-medium text-ink hover:text-accent-strong">{who(r.user_id)?.email ?? r.user_id}</Link><Badge tone="blue">{r.from_type} → {r.to_type}</Badge></p>
                {r.company_name && <p className="text-muted">{tr("Company")}: <span className="text-ink">{r.company_name}</span></p>}
                <p className="whitespace-pre-wrap text-muted">“{r.reason}”</p>
                <p className="text-[12px] text-muted">{formatDateTime(r.created_at, locale)}</p>
              </div>
              <RequestDecision id={r.id} />
            </div>
          ))}
        </CardBody>
      </Card>
      {done.length > 0 && (
        <Card>
          <CardHeader title={tr("Decided")} />
          <CardBody className="space-y-1.5 pt-3 text-[13px]">
            {done.map((r) => <p key={r.id} className="flex flex-wrap justify-between gap-2"><span className="text-ink">{who(r.user_id)?.email ?? r.user_id} · {r.from_type} → {r.to_type}</span><span className="text-muted">{r.status} · {r.decided_at ? formatDateTime(r.decided_at, locale) : ""}</span></p>)}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
