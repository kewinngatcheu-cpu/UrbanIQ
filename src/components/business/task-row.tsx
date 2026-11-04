import { CalendarClock, AlertCircle, Flag, Repeat, CornerDownRight } from "lucide-react";
import type { Task } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { toggleTaskForm } from "@/app/business/_actions/work";
import { dueLabel, isOverdue } from "@/components/app/task-row";
import { getTz } from "@/lib/tz";
import { getT, getLocale } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function BizTaskRow({ task, assignee, project, canToggle, extra, sub }: {
  task: Task;
  assignee?: string | null;
  project?: string | null;
  canToggle: boolean;
  extra?: React.ReactNode;
  sub?: boolean;
}) {
  const tz = await getTz();
  const tr = await getT();
  const locale = await getLocale();
  const done = task.status === "done";
  const overdue = isOverdue(task, tz);
  return (
    <div id={`task-${task.id}`} className={cn("group flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-snow", sub && "ml-6")}>
      {sub && <CornerDownRight className="mt-1 size-3.5 shrink-0 text-muted" />}
      <form action={toggleTaskForm}>
        <input type="hidden" name="id" value={task.id} />
        <button type="submit" disabled={!canToggle} aria-label={done ? tr('Mark "{title}" as open', { title: task.title }) : tr('Complete "{title}"', { title: task.title })}
          className={cn("mt-0.5 flex size-[18px] items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-50",
            done ? "border-mint-ink bg-mint-ink text-white" : "border-cloud hover:border-primary hover:bg-mist")}>
          {done && <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m2.5 6.2 2.2 2.2 4.8-4.9" /></svg>}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[14px] leading-snug text-ink", done && "text-muted line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {task.due_at && (
            <span className={cn("inline-flex items-center gap-1 text-[12px]", overdue ? "text-rose-ink" : "text-muted")}>
              {overdue ? <AlertCircle className="size-3" /> : <CalendarClock className="size-3" />} {dueLabel(task.due_at, task.kind, tz, tr, locale)}
            </span>
          )}
          {assignee && <Badge tone="gray">{assignee}</Badge>}
          {project && <Badge tone="outline">{project}</Badge>}
          {task.kind !== "task" && <Badge tone={task.kind === "deadline" ? "peach" : "lavender"}>{task.kind === "deadline" ? tr("Deadline") : tr("Appointment")}</Badge>}
          {task.priority === "high" && !done && <Badge tone="rose"><Flag /> {tr("High")}</Badge>}
          {task.recurrence !== "none" && <Badge tone="gray"><Repeat /> {tr(task.recurrence)}</Badge>}
        </div>
      </div>
      {extra}
    </div>
  );
}
