import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { getT, getLocale } from "@/lib/i18n/server";
import { PageHeader, EmptyState, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { ProjectDialog, STAGES } from "@/components/business/project-dialog";
import { membersOf, nameOf } from "../lib";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Projects") };
}

const TONE = { planned: "gray", active: "blue", on_hold: "peach", done: "mint" } as const;

export default async function Projects({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrgPage("projects.view");
  const tr = await getT();
  const locale = await getLocale();
  const [projects, tasks, members, clients] = await Promise.all([ctx.db.select("projects", { order: { column: "created_at", ascending: false } }), ctx.db.select("tasks"), membersOf(ctx), ctx.db.select("clients", { order: { column: "name" } })]);
  const showArchived = sp.show === "archived";
  const list = projects.filter((p) => (showArchived ? p.status === "archived" : p.status === "active"));
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const canCreate = ctx.can("projects.manage") && ctx.ent.has("projects");
  return (
    <div>
      <PageHeader title={tr("Projects")} description={tr("Goals with a responsible person, tasks, documents and a clear status.")}
        actions={canCreate ? <ProjectDialog members={members} clients={clients} trigger={<><Plus /> {tr("New project")}</>} /> : undefined} />
      {!ctx.ent.has("projects") && <UpgradeCard plan="starter" title={tr("Project management")} text={tr("Projects are not included in your current plan.")} className="mb-6" />}
      <div className="mb-5 flex gap-1 rounded-2xl bg-fog p-1 text-[13px] sm:w-fit">
        <Link href="/business/projects" className={cn("rounded-xl px-3.5 py-2", !showArchived ? "bg-white font-medium text-ink shadow-soft" : "text-muted")}>{tr("Active")}</Link>
        <Link href="/business/projects?show=archived" className={cn("rounded-xl px-3.5 py-2", showArchived ? "bg-white font-medium text-ink shadow-soft" : "text-muted")}>{tr("Archived")}</Link>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<FolderKanban />} title={showArchived ? tr("No archived projects") : tr("No projects yet")} description={tr("Group tasks, documents and people around a goal.")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const pt = tasks.filter((t) => t.project_id === p.id && !t.parent_id);
            const done = pt.filter((t) => t.status === "done").length;
            const stage = p.stage ?? "active";
            return (
              <Link key={p.id} href={`/business/projects/${p.id}`} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-cloud hover:shadow-lift">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={TONE[stage]}>{tr(STAGES.find(([v]) => v === stage)![1])}</Badge>
                  {p.target_date && <span className="text-[12px] text-muted">{formatDate(`${p.target_date}T12:00:00Z`, undefined, locale)}</span>}
                </div>
                <h3 className="mt-3 line-clamp-2 text-[16px] font-semibold text-ink">{p.name}</h3>
                {p.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{p.description}</p>}
                <div className="mt-4 flex items-center gap-2"><Progress value={pt.length ? (done / pt.length) * 100 : 0} /><span className="shrink-0 text-[12px] text-muted tabular-nums">{done}/{pt.length}</span></div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[12px] text-muted">
                  <span>{nameOf(members, p.lead_id) ?? tr("No lead")}</span>
                  {p.client_id && clientName.get(p.client_id) && <span>· {clientName.get(p.client_id)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
