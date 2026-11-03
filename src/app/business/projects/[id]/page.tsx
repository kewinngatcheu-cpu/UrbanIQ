import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil, Plus, Archive, ArchiveRestore, History } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { systemDb } from "@/lib/db";
import { getT, getLocale } from "@/lib/i18n/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress } from "@/components/ui/misc";
import { BizTaskRow } from "@/components/business/task-row";
import { BizTaskDialog } from "@/components/business/task-dialog";
import { ProjectDialog, STAGES } from "@/components/business/project-dialog";
import { archiveProjectForm } from "../../_actions/work";
import { membersOf, nameOf } from "../../lib";
import { formatDate, formatDateTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Project") };
}

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgPage("projects.view");
  const tr = await getT();
  const locale = await getLocale();
  const p = await ctx.db.get("projects", id);
  if (!p) notFound();
  const [tasks, docs, members, clients, history, projects] = await Promise.all([
    ctx.db.select("tasks", { where: { project_id: id }, order: { column: "due_at" } }),
    ctx.db.select("memories", { where: { project_id: id }, order: { column: "created_at", ascending: false } }),
    membersOf(ctx),
    ctx.db.select("clients", { order: { column: "name" } }),
    systemDb().select("org_activity", { where: { org_id: ctx.org.id, project_id: id }, order: { column: "created_at", ascending: false }, limit: 30 }),
    ctx.db.select("projects", { where: { status: "active" } }),
  ]);
  const roots = tasks.filter((t) => !t.parent_id);
  const done = roots.filter((t) => t.status === "done").length;
  const names = new Map(members.map((m) => [m.user_id, m.name]));
  const canEdit = (t: (typeof tasks)[number]) => ctx.can("tasks.manage") || (ctx.can("tasks.update_own") && (t.assignee_id === ctx.user.id || t.user_id === ctx.user.id));
  const dialogProps = { members, projects: projects.map((x) => ({ id: x.id, name: x.name })), meId: ctx.user.id, canAssign: ctx.can("tasks.manage") && ctx.ent.has("team"), canRecur: ctx.ent.has("workflows") };
  const stage = p.stage ?? "active";
  return (
    <div>
      <Link href="/business/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Projects")}</Link>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stage === "done" ? "mint" : stage === "on_hold" ? "peach" : stage === "planned" ? "gray" : "blue"}>{tr(STAGES.find(([v]) => v === stage)![1])}</Badge>
            {p.status === "archived" && <Badge tone="gray">{tr("Archived")}</Badge>}
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">{p.name}</h1>
          {p.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[15px] text-muted">{p.description}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            <div><dt className="text-muted">{tr("Responsible")}</dt><dd className="font-medium text-ink">{nameOf(members, p.lead_id) ?? tr("Nobody yet")}</dd></div>
            <div><dt className="text-muted">{tr("Client")}</dt><dd className="font-medium text-ink">{clients.find((c) => c.id === p.client_id)?.name ?? "—"}</dd></div>
            <div><dt className="text-muted">{tr("Deadline")}</dt><dd className="font-medium text-ink">{p.target_date ? formatDate(`${p.target_date}T12:00:00Z`, undefined, locale) : "—"}</dd></div>
          </dl>
        </div>
        {ctx.can("projects.manage") && (
          <div className="flex flex-wrap gap-2">
            <ProjectDialog project={p} members={members} clients={clients} trigger={<><Pencil /> {tr("Edit")}</>} triggerVariant="secondary" />
            <form action={archiveProjectForm}><input type="hidden" name="id" value={p.id} /><Button variant="ghost">{p.status === "active" ? <><Archive /> {tr("Archive")}</> : <><ArchiveRestore /> {tr("Restore")}</>}</Button></form>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={tr("Tasks")} description={tr("{done} of {total} done", { done, total: roots.length })}
            action={ctx.can("tasks.create") ? <BizTaskDialog {...dialogProps} defaultProject={p.id} trigger={<><Plus /> {tr("Task")}</>} triggerSize="sm" /> : undefined} />
          <CardBody className="pt-3">
            <Progress value={roots.length ? (done / roots.length) * 100 : 0} className="mb-3" />
            {roots.length === 0 ? <EmptyState title={tr("No tasks yet")} description={tr("Break the project into the first concrete steps.")} /> :
              roots.map((t) => (
                <div key={t.id}>
                  <BizTaskRow task={t} assignee={names.get(t.assignee_id ?? "") ?? null} canToggle={canEdit(t)}
                    extra={canEdit(t) ? <div className="flex shrink-0">{ctx.can("tasks.create") && <BizTaskDialog {...dialogProps} parentId={t.id} defaultProject={p.id} trigger={<Plus />} triggerVariant="ghost" triggerSize="icon" />}<BizTaskDialog {...dialogProps} task={t} trigger={<Pencil />} triggerVariant="ghost" triggerSize="icon" /></div> : undefined} />
                  {tasks.filter((s) => s.parent_id === t.id).map((s) => <BizTaskRow key={s.id} task={s} sub assignee={names.get(s.assignee_id ?? "") ?? null} canToggle={canEdit(s)} />)}
                </div>
              ))}
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={tr("Documents")} description={tr("Knowledge linked to this project")} />
            <CardBody className="space-y-1 pt-3">
              {docs.length === 0 ? <p className="text-sm text-muted">{tr("Link documents to this project in Memory.")}</p> : docs.map((d) => (
                <Link key={d.id} href={`/business/memory/${d.id}`} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[14px] text-ink hover:bg-snow"><FileText className="size-4 shrink-0 text-accent" /> <span className="truncate">{d.title}</span></Link>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><History className="size-4 text-accent" /> {tr("History")}</span>} />
            <CardBody className="pt-3">
              {history.length === 0 ? <p className="text-sm text-muted">{tr("No activity yet.")}</p> : (
                <ol className="space-y-3 border-l border-line pl-4">
                  {history.map((h) => (
                    <li key={h.id} className="relative text-[13px]">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                      <p className="text-ink">{h.summary}</p>
                      <p className="text-[11.5px] text-muted">{names.get(h.actor_id) ?? "—"} · {formatDateTime(h.created_at, locale)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
