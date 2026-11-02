import { getT } from "@/lib/i18n/server";
import { Repeat, CalendarClock, Flag, AlertCircle } from "lucide-react";
import type { Task } from "@/lib/db/types";
import { Badge } from "@/components/ui/badge";
import { toggleTask } from "@/app/app/_actions/life";
import { cn } from "@/lib/utils";
import { getTz, dayKey, fmt } from "@/lib/tz";
import type { T } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export function dueLabel(iso: string, kind: Task["kind"], tz: string, tr: T = (s) => s, lang: "en" | "de" = "en") {
  const today = dayKey(new Date(), tz);
  const key = dayKey(iso, tz);
  const diff = Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  const time = kind === "appointment" ? ` · ${fmt(iso, tz, { hour: "2-digit", minute: "2-digit" }, lang)}` : "";
  if (diff === 0) return `${tr("Today")}${time}`;
  if (diff === 1) return `${tr("Tomorrow")}${time}`;
  if (diff === -1) return `${tr("Yesterday")}${time}`;
  if (diff > 1 && diff < 7) return `${fmt(iso, tz, { weekday: "long" }, lang)}${time}`;
  return `${fmt(iso, tz, { day: "numeric", month: "short" }, lang)}${time}`;
}

export function isOverdue(t: Pick<Task, "due_at" | "status">, tz: string) {
  if (!t.due_at || t.status === "done") return false;
  return dayKey(t.due_at, tz) < dayKey(new Date(), tz);
}

export async function TaskRow({ task, extra, compact }: { task: Task; extra?: React.ReactNode; compact?: boolean }) {
  const tr = await getT();
  const locale = await getLocale();
  const tz = await getTz();
  const done = task.status === "done";
  const overdue = isOverdue(task, tz);
  return (
    <div id={`task-${task.id}`} className={cn("group flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-snow", compact && "py-2")}>
      <form action={toggleTask}>
        <input type="hidden" name="id" value={task.id} />
        <button
          type="submit"
          aria-label={done ? tr('Mark "{title}" as open', { title: task.title }) : tr('Complete "{title}"', { title: task.title })}
          className={cn(
            "mt-0.5 flex size-[18px] items-center justify-center rounded-full border-2 transition",
            done ? "border-mint-ink bg-mint-ink text-white" : "border-cloud hover:border-primary hover:bg-mist",
          )}
        >
          {done && <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m2.5 6.2 2.2 2.2 4.8-4.9" /></svg>}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[14px] leading-snug text-ink", done && "text-muted line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {task.due_at && (
            <span className={cn("inline-flex items-center gap-1 text-[12px]", overdue ? "text-rose-ink" : "text-muted")}>
              {overdue ? <AlertCircle className="size-3" /> : <CalendarClock className="size-3" />}
              {dueLabel(task.due_at, task.kind, tz, tr, locale)}
            </span>
          )}
          {task.kind !== "task" && <Badge tone={task.kind === "deadline" ? "peach" : "lavender"}>{task.kind === "deadline" ? tr("Deadline") : tr("Appointment")}</Badge>}
          {task.priority === "high" && !done && <Badge tone="rose"><Flag /> {tr("High")}</Badge>}
          {task.recurrence !== "none" && <Badge tone="gray"><Repeat /> {tr(task.recurrence)}</Badge>}
        </div>
      </div>
      {extra}
    </div>
  );
}
