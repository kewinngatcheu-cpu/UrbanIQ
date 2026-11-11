import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export const TASK_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  notes: string;
  priority: (typeof PRIORITIES)[number];
  status: (typeof TASK_STATUSES)[number];
  project: string | null;
  due_at: string | null;
  postponed_count: number;
  estimate_min: number | null;
  completed_at: string | null;
  created_by: string;
  goal_id: string | null;
  course_id: string | null;
  blocker_reason: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export const taskInput = z.object({
  workspaceId: z.string().min(1).max(64).default("personal"),
  title: z.string().min(1).max(300),
  notes: z.string().max(5000).default(""),
  priority: z.enum(PRIORITIES).default("medium"),
  project: z.string().max(100).nullish(),
  dueAt: z.string().datetime({ offset: true }).nullish(),
  estimateMin: z.number().int().min(1).max(10000).nullish(),
  goalId: z.string().uuid().nullish(),
  courseId: z.string().uuid().nullish(),
});
export const taskPatch = taskInput.partial().omit({ workspaceId: true }).extend({ status: z.enum(TASK_STATUSES).optional() });

export async function createTask(raw: z.input<typeof taskInput>, actor: string): Promise<Task> {
  const t = taskInput.parse(raw);
  const db = await getDb();
  const rows = await db.query<Task>(
    `INSERT INTO tasks (workspace_id, title, notes, priority, project, due_at, estimate_min, created_by, goal_id, course_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [t.workspaceId, t.title, t.notes, t.priority, t.project ?? null, t.dueAt ?? null, t.estimateMin ?? null, actor, t.goalId ?? null, t.courseId ?? null],
  );
  await audit({ actor, action: "task.create", target: rows[0].id, workspaceId: t.workspaceId, level: actor === "owner" ? 3 : 2, details: { title: t.title } });
  return rows[0];
}

export async function updateTask(id: string, raw: z.input<typeof taskPatch>, actor: string): Promise<Task> {
  const p = taskPatch.parse(raw);
  const db = await getDb();
  const cur = (await db.query<Task>(`SELECT * FROM tasks WHERE id = $1`, [id]))[0];
  if (!cur) throw new Error("Aufgabe nicht gefunden");
  const newDue = p.dueAt !== undefined ? p.dueAt : cur.due_at;
  // A task counts as postponed when an existing deadline is moved later.
  const postponed = cur.due_at && newDue && new Date(newDue) > new Date(cur.due_at) ? 1 : 0;
  const status = p.status ?? cur.status;
  const rows = await db.query<Task>(
    `UPDATE tasks SET title=$2, notes=$3, priority=$4, project=$5, due_at=$6, estimate_min=$7, status=$8,
       postponed_count = postponed_count + $9, goal_id = $10, course_id = $11,
       completed_at = CASE WHEN $8 = 'done' AND status <> 'done' THEN now() WHEN $8 <> 'done' THEN NULL ELSE completed_at END,
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, p.title ?? cur.title, p.notes ?? cur.notes, p.priority ?? cur.priority, p.project !== undefined ? p.project : cur.project,
      newDue, p.estimateMin !== undefined ? p.estimateMin : cur.estimate_min, status, postponed,
      p.goalId !== undefined ? p.goalId : cur.goal_id, p.courseId !== undefined ? p.courseId : cur.course_id],
  );
  await audit({ actor, action: "task.update", target: id, workspaceId: cur.workspace_id, level: 3, details: { fields: Object.keys(p), postponed: !!postponed } });
  return rows[0];
}

export async function deleteTask(id: string, actor: string) {
  const db = await getDb();
  const rows = await db.query<Task>(`DELETE FROM tasks WHERE id = $1 RETURNING *`, [id]);
  if (!rows.length) throw new Error("Aufgabe nicht gefunden");
  await audit({ actor, action: "task.delete", target: id, workspaceId: rows[0].workspace_id, level: 3, details: { title: rows[0].title } });
}

export async function listTasks(opts: { workspaceId?: string; status?: "open" | "done" | "all"; goalId?: string; courseId?: string } = {}): Promise<Task[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.workspaceId) { params.push(opts.workspaceId); where.push(`workspace_id = $${params.length}`); }
  if (opts.goalId) { params.push(opts.goalId); where.push(`goal_id = $${params.length}`); }
  if (opts.courseId) { params.push(opts.courseId); where.push(`course_id = $${params.length}`); }
  if (opts.status === "open" || !opts.status) where.push(`status IN ('open','in_progress')`);
  if (opts.status === "done") where.push(`status = 'done'`);
  return db.query<Task>(
    `SELECT * FROM tasks ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              due_at NULLS LAST, created_at LIMIT 500`,
    params,
  );
}

/**
 * Deterministic priority score (0–100) used for "Top 3" until the AI planner (Phase 2) exists.
 * Transparent on purpose: priority weight + deadline urgency + business workspace bonus + postponement signal.
 */
export function priorityScore(t: Task, now = new Date()): number {
  const base = { critical: 60, high: 45, medium: 25, low: 10 }[t.priority];
  let urgency = 0;
  if (t.due_at) {
    const days = (new Date(t.due_at).getTime() - now.getTime()) / 864e5;
    urgency = days < 0 ? 30 : days < 1 ? 25 : days < 3 ? 15 : days < 7 ? 8 : 0;
  }
  const strategic = t.workspace_id !== "personal" ? 5 : 0;
  const postponed = Math.min(t.postponed_count * 3, 9);
  return Math.min(100, base + urgency + strategic + postponed);
}

export async function taskStats() {
  const db = await getDb();
  const [r] = await db.query<{ open: number; overdue: number; due_today: number; done_week: number; created_week: number }>(
    `SELECT
       count(*) FILTER (WHERE status IN ('open','in_progress'))::int AS open,
       count(*) FILTER (WHERE status IN ('open','in_progress') AND due_at < now())::int AS overdue,
       count(*) FILTER (WHERE status IN ('open','in_progress') AND due_at::date = (now() AT TIME ZONE 'Europe/Berlin')::date)::int AS due_today,
       count(*) FILTER (WHERE status = 'done' AND completed_at > now() - interval '7 days')::int AS done_week,
       count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS created_week
     FROM tasks`,
  );
  return r;
}

export async function completionsByDay(days = 14) {
  const db = await getDb();
  return db.query<{ day: string; n: number }>(
    `SELECT to_char(d, 'YYYY-MM-DD') AS day,
       (SELECT count(*)::int FROM tasks t WHERE t.status = 'done' AND (t.completed_at AT TIME ZONE 'Europe/Berlin')::date = d::date) AS n
     FROM generate_series((now() AT TIME ZONE 'Europe/Berlin')::date - ($1::int - 1), (now() AT TIME ZONE 'Europe/Berlin')::date, interval '1 day') d
     ORDER BY d`,
    [days],
  );
}
