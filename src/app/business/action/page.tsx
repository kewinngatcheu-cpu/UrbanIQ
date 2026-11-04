import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { getT, getLocale } from "@/lib/i18n/server";
import { PageHeader, EmptyState, Progress } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { BUSINESS_ACTION_TYPES, actionLabel } from "@/lib/ai/templates";
import { ACTION_STATUSES } from "@/lib/action-status";
import { membersOf, nameOf } from "../lib";
import { relativeTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Action") };
}

export default async function BusinessActionPage() {
  const ctx = await requireOrgPage("actions.use");
  const tr = await getT();
  const locale = await getLocale();
  const [items, members] = await Promise.all([ctx.db.select("action_items", { order: { column: "updated_at", ascending: false } }), membersOf(ctx)]);
  return (
    <div>
      <PageHeader title={tr("Action")} description={tr("Business processes prepared by ONE — offers, emails, contract checks and follow-ups. You review and send.")}
        actions={<Link href="/business/action/new" className={buttonVariants()}><Plus /> {tr("New action")}</Link>} />
      {items.length === 0 ? (
        <div className="space-y-6">
          <EmptyState icon={<Zap />} title={tr("No actions yet")} description={tr("Pick a business process. ONE breaks it down into steps and prepares drafts.")} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BUSINESS_ACTION_TYPES.map((t) => (
              <Link key={t.type} href={`/business/action/new?type=${t.type}`} className="rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-cloud hover:shadow-lift">
                <span className="text-xl" aria-hidden>{t.emoji}</span>
                <p className="mt-2 text-[14px] font-semibold text-ink">{tr(t.label)}</p>
                <p className="text-[12.5px] text-muted">{tr(t.description)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {ACTION_STATUSES.map((col) => {
            const list = items.filter((i) => i.status === col.id);
            return (
              <section key={col.id} className="min-w-0 rounded-2xl bg-snow/80 p-3" aria-label={tr(col.label)}>
                <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-ink">
                  <span className={`size-2 shrink-0 rounded-full ${col.dot}`} /> <span className="truncate">{tr(col.label)}</span>
                  <span className="ml-auto rounded-full bg-white px-2 text-[11.5px] font-medium text-muted">{list.length}</span>
                </h2>
                <div className="space-y-2.5">
                  {list.length === 0 && <p className="px-1 py-4 text-center text-[12.5px] text-muted">{tr("Nothing here")}</p>}
                  {list.map((a) => {
                    const done = a.steps.filter((s) => s.done).length;
                    return (
                      <Link key={a.id} href={`/business/action/${a.id}`} className="block rounded-xl border border-line bg-white p-3.5 shadow-soft transition hover:border-cloud hover:shadow-lift">
                        <p className="text-[11.5px] font-medium text-muted">{tr(actionLabel(a.type))}</p>
                        <p className="mt-0.5 line-clamp-2 text-[14px] font-medium text-ink">{a.title}</p>
                        <div className="mt-3 flex items-center gap-2"><Progress value={a.steps.length ? (done / a.steps.length) * 100 : 0} /><span className="shrink-0 text-[11px] text-muted">{done}/{a.steps.length}</span></div>
                        <p className="mt-2 truncate text-[11px] text-muted">{nameOf(members, a.user_id) ?? "—"} · {relativeTime(a.updated_at, undefined, locale)}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
