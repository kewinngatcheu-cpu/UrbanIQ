import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { PageHeader, EmptyState, Progress } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { ACTION_TYPES, actionLabel } from "@/lib/ai/templates";
import { relativeTime } from "@/lib/utils";
import type { ActionStatus } from "@/lib/db/types";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Action") };
}

const COLUMNS: { status: ActionStatus; label: string; dot: string }[] = [
  { status: "new", label: "New", dot: "bg-primary" },
  { status: "in_progress", label: "In progress", dot: "bg-lavender-ink" },
  { status: "waiting", label: "Waiting for you", dot: "bg-peach-ink" },
  { status: "done", label: "Done", dot: "bg-mint-ink" },
];

export default async function ActionPage() {
  const tr = await getT();
  const locale = await getLocale();
  const user = await requireUser();
  const db = await userDb(user.id);
  const items = await db.select("action_items", { order: { column: "updated_at", ascending: false } });

  return (
    <div>
      <PageHeader
        title={tr("Action")}
        description={tr("Turn information into things that get done. ONE prepares — you decide and confirm.")}
        actions={<Link href="/app/action/new" className={buttonVariants()}><Plus /> {tr("New action")}</Link>}
      />

      {items.length === 0 ? (
        <div className="space-y-6">
          <EmptyState icon={<Zap />} title={tr("No actions yet")} description={tr("Pick something you need to get done. ONE will break it down into steps and prepare drafts for you.")} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACTION_TYPES.map((t) => (
              <Link key={t.type} href={`/app/action/new?type=${t.type}`} className="rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-cloud hover:shadow-lift">
                <span className="text-xl" aria-hidden>{t.emoji}</span>
                <p className="mt-2 text-[14px] font-semibold text-ink">{tr(t.label)}</p>
                <p className="text-[12.5px] text-muted">{tr(t.description)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const list = items.filter((i) => i.status === col.status);
            return (
              <section key={col.status} className="rounded-2xl bg-snow/80 p-3" aria-label={tr(col.label)}>
                <h2 className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-ink">
                  <span className={`size-2 rounded-full ${col.dot}`} /> {tr(col.label)}
                  <span className="ml-auto rounded-full bg-white px-2 text-[11.5px] font-medium text-muted">{list.length}</span>
                </h2>
                <div className="space-y-2.5">
                  {list.length === 0 && <p className="px-1 py-4 text-center text-[12.5px] text-muted">{tr("Nothing here")}</p>}
                  {list.map((a) => {
                    const done = a.steps.filter((s) => s.done).length;
                    return (
                      <Link key={a.id} href={`/app/action/${a.id}`} className="block rounded-xl border border-line bg-white p-3.5 shadow-soft transition hover:border-cloud hover:shadow-lift">
                        <p className="text-[11.5px] font-medium text-muted">{tr(actionLabel(a.type))}</p>
                        <p className="mt-0.5 line-clamp-2 text-[14px] font-medium text-ink">{a.title}</p>
                        {a.missing_info.length > 0 && a.status !== "done" && <p className="mt-1.5 text-[12px] text-peach-ink">{a.missing_info.length} missing {a.missing_info.length === 1 ? "detail" : "details"}</p>}
                        <div className="mt-3 flex items-center gap-2">
                          <Progress value={a.steps.length ? (done / a.steps.length) * 100 : 0} />
                          <span className="shrink-0 text-[11px] text-muted">{done}/{a.steps.length}</span>
                        </div>
                        <p className="mt-2 text-[11px] text-muted">{tr("Updated {time}", { time: relativeTime(a.updated_at, undefined, locale) })}</p>
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
