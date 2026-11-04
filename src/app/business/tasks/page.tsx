import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, Pencil, Plus } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { getT } from "@/lib/i18n/server";
import { getTz, dayKey } from "@/lib/tz";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm";
import { BizTaskRow } from "@/components/business/task-row";
import { BizTaskDialog } from "@/components/business/task-dialog";
import { deleteTask } from "../_actions/work";
import { membersOf, nameOf } from "../lib";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/types";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Tasks") };
}

const FILTERS = [["mine", "Mine"], ["open", "All open"], ["overdue", "Overdue"], ["team", "By person"], ["done", "Done"]] as const;

export default async function BusinessTasks({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrgPage("tasks.view");
  const tr = await getT();
  const tz = await getTz();
  const filter = FILTERS.some(([f]) => f === sp.filter) ? sp.filter! : "mine";
  const [tasks, projects, members] = await Promise.all([ctx.db.select("tasks", { order: { column: "due_at" } }), ctx.db.select("projects", { where: { status: "active" } }), membersOf(ctx)]);
  const today = dayKey(new Date(), tz);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const canAssign = ctx.can("tasks.manage") && ctx.ent.has("team");
  const canRecur = ctx.ent.has("workflows");
  const canEdit = (t: Task) => ctx.can("tasks.manage") || (ctx.can("tasks.update_own") && (t.assignee_id === ctx.user.id || t.user_id === ctx.user.id));
  const dialogProps = { members, projects: projects.map((p) => ({ id: p.id, name: p.name })), meId: ctx.user.id, canAssign, canRecur };

  const roots = tasks.filter((t) => !t.parent_id);
  const subsOf = (id: string) => tasks.filter((t) => t.parent_id === id);
  let list: Task[] = roots.filter((t) => t.status === "open");
  if (filter === "mine") list = list.filter((t) => t.assignee_id === ctx.user.id);
  if (filter === "overdue") list = list.filter((t) => t.due_at && dayKey(t.due_at, tz) < today);
  if (filter === "done") list = roots.filter((t) => t.status === "done").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  if (filter !== "done") list = [...list.filter((t) => t.due_at), ...list.filter((t) => !t.due_at)];

  const row = (t: Task, sub = false) => (
    <div key={t.id}>
      <BizTaskRow task={t} sub={sub} assignee={nameOf(members, t.assignee_id)} project={t.project_id ? projectName.get(t.project_id) : null} canToggle={canEdit(t)}
        extra={canEdit(t) ? (
          <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            {!sub && ctx.can("tasks.create") && <BizTaskDialog {...dialogProps} parentId={t.id} defaultProject={t.project_id ?? undefined} trigger={<Plus />} triggerVariant="ghost" triggerSize="icon" />}
            <BizTaskDialog {...dialogProps} task={t} trigger={<Pencil />} triggerVariant="ghost" triggerSize="icon" />
            {(ctx.can("tasks.manage") || t.user_id === ctx.user.id) && <ConfirmAction action={deleteTask} fields={{ id: t.id }} trigger={tr("Delete")} triggerVariant="ghost" danger title={tr("Delete this task?")} description={tr("Sub-tasks are deleted too.")} confirmLabel={tr("Delete")} />}
          </div>
        ) : undefined} />
      {!sub && subsOf(t.id).map((s) => row(s, true))}
    </div>
  );

  return (
    <div>
      <PageHeader title={tr("Tasks")} description={tr("Who does what, by when — for the whole team.")}
        actions={ctx.can("tasks.create") ? <BizTaskDialog {...dialogProps} trigger={<><Plus /> {tr("New task")}</>} /> : undefined} />
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-fog p-1" aria-label={tr("Task filters")}>
        {FILTERS.map(([f, label]) => (
          <Link key={f} href={`/business/tasks?filter=${f}`} aria-current={filter === f ? "page" : undefined}
            className={cn("shrink-0 rounded-xl px-3.5 py-2 text-[13px] transition", filter === f ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:text-ink")}>{tr(label)}</Link>
        ))}
      </nav>
      {filter === "team" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((m) => {
            const mt = roots.filter((t) => t.status === "open" && t.assignee_id === m.user_id);
            return (
              <Card key={m.id}>
                <CardBody>
                  <div className="mb-2 flex items-center justify-between"><p className="font-semibold text-ink">{m.name}</p><span className="text-[12px] text-muted">{tr("{n} open", { n: mt.length })}</span></div>
                  {mt.length === 0 ? <p className="text-sm text-muted">{tr("All clear.")}</p> : mt.map((t) => row(t))}
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody className="pt-3">
            {list.length === 0 ? <EmptyState icon={<CheckSquare />} title={tr("No tasks here")} description={ctx.can("tasks.create") ? tr("Create one with “New task”.") : tr("Tasks shared with you appear here.")} /> : <div className="divide-y divide-line/60">{list.map((t) => row(t))}</div>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
