import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, FolderKanban, Plus, Tags, Target, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { hasFeature } from "@/lib/permissions/entitlements";
import { getTz, dayKey, addDays, fmt } from "@/lib/tz";
import { PageHeader, EmptyState, Progress } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { TaskRow } from "@/components/app/task-row";
import { TaskDialog } from "@/components/app/task-dialog";
import { deleteTask, toggleReminder, deleteReminder, archiveProject, deleteProject, deleteCategory } from "../_actions/life";
import { ReminderForm, ProjectDialog, CategoryForm } from "./client";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/types";

export const metadata: Metadata = { title: "Life" };

const VIEWS = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "week", label: "Week", icon: CalendarDays },
  { id: "all", label: "All tasks", icon: FolderKanban },
  { id: "projects", label: "Projects & goals", icon: Target },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "categories", label: "Categories", icon: Tags },
] as const;

type SP = { view?: string; week?: string; filter?: string; project?: string };

export default async function LifePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.id === sp.view) ? sp.view! : "today";
  const user = await requireUser();
  const tz = await getTz();
  const db = await userDb(user.id);
  const [tasks, projects, categories, reminders] = await Promise.all([
    db.select("tasks", { order: { column: "due_at" } }),
    db.select("projects", { order: { column: "created_at" } }),
    db.select("categories", { order: { column: "name" } }),
    db.select("reminders", { order: { column: "remind_at" } }),
  ]);
  const canRecur = hasFeature(user, "recurringTasks");
  const activeProjects = projects.filter((p) => p.status === "active");
  const today = dayKey(new Date(), tz);
  const dialogProps = { projects: activeProjects, categories, canRecur };

  const editBtns = (t: Task) => (
    <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
      <TaskDialog task={t} {...dialogProps} trigger={<Pencil />} triggerVariant="ghost" triggerSize="icon" />
      <ConfirmAction action={deleteTask} fields={{ id: t.id }} trigger="Delete" triggerVariant="ghost" danger title="Delete this item?" confirmLabel="Delete" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Life" description="Your tasks, appointments, deadlines, goals and reminders — calmly organised."
        actions={<TaskDialog {...dialogProps} trigger={<><Plus /> New item</>} defaultDate={view === "today" ? today : undefined} />} />

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-fog p-1" aria-label="Life views">
        {VIEWS.map((v) => (
          <Link key={v.id} href={`/app/life?view=${v.id}`} aria-current={view === v.id ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] transition", view === v.id ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:text-ink")}>
            <v.icon className="size-3.5" /> {v.label}
          </Link>
        ))}
      </nav>

      {view === "today" && (() => {
        const overdue = tasks.filter((t) => t.status === "open" && t.due_at && dayKey(t.due_at, tz) < today);
        const due = tasks.filter((t) => t.due_at && dayKey(t.due_at, tz) === today);
        const anytime = tasks.filter((t) => t.status === "open" && !t.due_at);
        const doneToday = due.filter((t) => t.status === "done").length;
        return (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title={fmt(new Date(), tz, { weekday: "long", day: "numeric", month: "long" })} description={due.length ? `${doneToday} of ${due.length} done` : "Nothing scheduled"} />
              <CardBody className="pt-3">
                {due.length > 0 && <Progress value={(doneToday / due.length) * 100} className="mb-3" />}
                {overdue.length > 0 && (
                  <div className="mb-4">
                    <p className="px-2 pb-1 text-[11.5px] font-semibold uppercase tracking-wider text-rose-ink">Overdue</p>
                    {overdue.map((t) => <TaskRow key={t.id} task={t} extra={editBtns(t)} />)}
                  </div>
                )}
                {due.length === 0 && overdue.length === 0 ? (
                  <EmptyState icon={<CalendarDays />} title="Nothing scheduled today" description="Enjoy the space — or plan something below." />
                ) : due.map((t) => <TaskRow key={t.id} task={t} extra={editBtns(t)} />)}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Anytime" description="Open tasks without a date" />
              <CardBody className="pt-3">
                {anytime.length === 0 ? <p className="text-sm text-muted">All clear.</p> : anytime.slice(0, 12).map((t) => <TaskRow key={t.id} task={t} compact extra={editBtns(t)} />)}
              </CardBody>
            </Card>
          </div>
        );
      })()}

      {view === "week" && (() => {
        const offset = Number.isInteger(Number(sp.week)) ? Number(sp.week) : 0;
        const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
        const monday = addDays(today, -dow + offset * 7);
        const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
        return (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-ink">
                {fmt(`${days[0]}T12:00:00Z`, "UTC", { day: "numeric", month: "short" })} – {fmt(`${days[6]}T12:00:00Z`, "UTC", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <div className="flex items-center gap-1">
                <Link href={`/app/life?view=week&week=${offset - 1}`} className="rounded-lg p-2 text-muted hover:bg-fog hover:text-ink" aria-label="Previous week"><ChevronLeft className="size-4" /></Link>
                {offset !== 0 && <Link href="/app/life?view=week" className="rounded-lg px-3 py-1.5 text-[13px] text-accent-strong hover:bg-mist">This week</Link>}
                <Link href={`/app/life?view=week&week=${offset + 1}`} className="rounded-lg p-2 text-muted hover:bg-fog hover:text-ink" aria-label="Next week"><ChevronRight className="size-4" /></Link>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((d) => {
                const items = tasks.filter((t) => t.due_at && dayKey(t.due_at, tz) === d);
                const rem = reminders.filter((r) => !r.done && dayKey(r.remind_at, tz) === d);
                const isToday = d === today;
                return (
                  <div key={d} className={cn("min-h-40 rounded-2xl border p-3", isToday ? "border-cloud bg-mist/50" : "border-line bg-white")}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className={cn("text-[12px] font-semibold uppercase tracking-wider", isToday ? "text-accent-strong" : "text-muted")}>{fmt(`${d}T12:00:00Z`, "UTC", { weekday: "short" })}</span>
                      <span className={cn("text-[15px] font-semibold", isToday ? "flex size-7 items-center justify-center rounded-full bg-accent text-white" : "text-ink")}>{Number(d.slice(8))}</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((t) => (
                        <div key={t.id} className={cn("rounded-lg px-2 py-1.5 text-[12.5px] leading-snug", t.status === "done" ? "bg-fog text-muted line-through" : t.kind === "deadline" ? "bg-peach text-peach-ink" : t.kind === "appointment" ? "bg-lavender text-lavender-ink" : "bg-snow text-ink")}>
                          {t.kind === "appointment" && <span className="font-semibold">{fmt(t.due_at!, tz, { hour: "2-digit", minute: "2-digit" })} </span>}
                          {t.title}
                        </div>
                      ))}
                      {rem.map((r) => (
                        <div key={r.id} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-muted"><Bell className="size-3" /> {r.title}</div>
                      ))}
                      {!items.length && !rem.length && <p className="pt-3 text-center text-[11.5px] text-muted/70">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 flex flex-wrap gap-3 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded bg-snow ring-1 ring-line" /> Task</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded bg-lavender" /> Appointment</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded bg-peach" /> Deadline</span>
            </p>
          </div>
        );
      })()}

      {view === "all" && (() => {
        const filter = sp.filter ?? "open";
        let list = tasks.filter((t) => (filter === "done" ? t.status === "done" : filter === "all" ? true : t.status === "open"));
        if (sp.project) list = list.filter((t) => t.project_id === sp.project);
        list = [...list.filter((t) => t.due_at), ...list.filter((t) => !t.due_at)];
        return (
          <Card>
            <CardHeader title="All tasks" description={`${list.length} ${list.length === 1 ? "item" : "items"}`}
              action={
                <div className="flex gap-1 rounded-xl bg-fog p-1 text-[12.5px]">
                  {["open", "done", "all"].map((f) => (
                    <Link key={f} href={`/app/life?view=all&filter=${f}${sp.project ? `&project=${sp.project}` : ""}`} className={cn("rounded-lg px-2.5 py-1 capitalize", filter === f ? "bg-white text-ink shadow-soft" : "text-muted")}>{f}</Link>
                  ))}
                </div>
              } />
            <CardBody className="pt-3">
              {list.length === 0 ? <EmptyState icon={<FolderKanban />} title="No tasks here" description="Create one with “New item”." /> : (
                <div className="divide-y divide-line/60">
                  {list.map((t) => {
                    const p = projects.find((x) => x.id === t.project_id);
                    const c = categories.find((x) => x.id === t.category_id);
                    return (
                      <TaskRow key={t.id} task={t} extra={
                        <div className="flex items-center gap-1.5">
                          {p && <Badge tone="outline"><span className="size-1.5 rounded-full" style={{ background: p.color }} /> {p.name}</Badge>}
                          {c && <Badge tone="gray">{c.name}</Badge>}
                          {editBtns(t)}
                        </div>
                      } />
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })()}

      {view === "projects" && (
        <div>
          <div className="mb-4 flex justify-end gap-2">
            <ProjectDialog kind="goal" />
            <ProjectDialog kind="project" />
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={<Target />} title="No projects or goals yet" description="Group related tasks into projects, or set personal goals with a target date." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const pt = tasks.filter((t) => t.project_id === p.id);
                const done = pt.filter((t) => t.status === "done").length;
                return (
                  <Card key={p.id} className={cn(p.status === "archived" && "opacity-60")}>
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <Badge tone={p.kind === "goal" ? "mint" : "blue"}>{p.kind === "goal" ? <Target /> : <FolderKanban />} {p.kind === "goal" ? "Goal" : "Project"}</Badge>
                        <span className="size-3 rounded-full" style={{ background: p.color }} />
                      </div>
                      <h3 className="mt-3 text-[16px] font-semibold text-ink">{p.name}</h3>
                      {p.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted">{p.description}</p>}
                      {p.target_date && <p className="mt-2 text-[12.5px] text-muted">Target: {fmt(`${p.target_date}T12:00:00Z`, "UTC", { day: "numeric", month: "long", year: "numeric" })}</p>}
                      <div className="mt-4 flex items-center gap-2">
                        <Progress value={pt.length ? (done / pt.length) * 100 : 0} />
                        <span className="shrink-0 text-[12px] text-muted">{done}/{pt.length}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-1">
                        <Link href={`/app/life?view=all&filter=all&project=${p.id}`} className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-accent-strong hover:bg-mist">View tasks</Link>
                        <form action={archiveProject}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button variant="ghost" size="sm">{p.status === "active" ? <><Archive /> Archive</> : <><ArchiveRestore /> Restore</>}</Button>
                        </form>
                        <ConfirmAction action={deleteProject} fields={{ id: p.id }} trigger="Delete" triggerVariant="ghost" danger title={`Delete “${p.name}”?`} description="Tasks in it are kept, but unlinked." confirmLabel="Delete" />
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "reminders" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Reminders" description="ONE shows due reminders on your dashboard. Push & email notifications are on the roadmap." />
            <CardBody className="pt-3">
              {reminders.length === 0 ? <EmptyState icon={<Bell />} title="No reminders" description="Add one on the right." /> : (
                <ul className="divide-y divide-line/60">
                  {reminders.map((r) => {
                    const due = Date.parse(r.remind_at) <= Date.now();
                    return (
                      <li key={r.id} className="flex items-center gap-3 py-2.5">
                        <form action={toggleReminder}>
                          <input type="hidden" name="id" value={r.id} />
                          <button aria-label={r.done ? "Mark as not done" : "Mark as done"} className={cn("flex size-[18px] items-center justify-center rounded-full border-2", r.done ? "border-mint-ink bg-mint-ink text-white" : "border-cloud hover:border-primary")}>
                            {r.done && <span className="text-[10px]">✓</span>}
                          </button>
                        </form>
                        <span className={cn("flex-1 text-[14px]", r.done ? "text-muted line-through" : "text-ink")}>{r.title}</span>
                        <span className={cn("text-[12.5px]", due && !r.done ? "font-medium text-peach-ink" : "text-muted")}>{fmt(r.remind_at, tz, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        <ConfirmAction action={deleteReminder} fields={{ id: r.id }} trigger="Delete" triggerVariant="ghost" danger title="Delete reminder?" confirmLabel="Delete" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="New reminder" />
            <CardBody><ReminderForm defaultDate={today} /></CardBody>
          </Card>
        </div>
      )}

      {view === "categories" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Your categories" description="Use them for tasks and memories." />
            <CardBody className="pt-3">
              {categories.length === 0 ? <EmptyState icon={<Tags />} title="No categories yet" description="Create your own, e.g. Home, Finance, Health." /> : (
                <ul className="divide-y divide-line/60">
                  {categories.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <span className="size-3 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 text-[14px] text-ink">{c.name}</span>
                      <span className="text-[12px] text-muted">{tasks.filter((t) => t.category_id === c.id).length} tasks</span>
                      <ConfirmAction action={deleteCategory} fields={{ id: c.id }} trigger="Delete" triggerVariant="ghost" danger title={`Delete “${c.name}”?`} description="Items in this category are kept." confirmLabel="Delete" />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="New category" />
            <CardBody><CategoryForm /></CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
