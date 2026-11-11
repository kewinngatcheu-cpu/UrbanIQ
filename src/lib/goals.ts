import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";

export const GOAL_CATEGORIES = ["personal", "business", "finance", "fitness", "learning", "career"] as const;
export interface Milestone { id: string; goal_id: string; title: string; due_date: string | null; done_at: string | null; position: number }
export interface Goal {
  id: string; workspace_id: string; title: string; description: string; category: (typeof GOAL_CATEGORIES)[number];
  horizon: string; target_date: string | null; status: string; metric_unit: string | null;
  metric_start: number | null; metric_target: number | null; metric_current: number | null;
  created_at: string; updated_at: string;
  milestones?: Milestone[]; open_tasks?: number; done_tasks?: number; progress?: number | null;
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const goalInput = z.object({
  workspaceId: z.string().max(64).default("personal"),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
  category: z.enum(GOAL_CATEGORIES).default("personal"),
  horizon: z.enum(["month", "quarter", "year", "long_term"]).default("quarter"),
  targetDate: day.nullish(),
  metricUnit: z.string().max(30).nullish(),
  metricStart: z.number().nullish(),
  metricTarget: z.number().nullish(),
  metricCurrent: z.number().nullish(),
  milestones: z.array(z.object({ title: z.string().min(1).max(200), dueDate: day.nullish() })).max(30).default([]),
});
export const goalPatch = goalInput.omit({ milestones: true, workspaceId: true }).partial().extend({
  status: z.enum(["active", "achieved", "paused", "dropped"]).optional(),
});

const SELECT = `SELECT g.id, g.workspace_id, g.title, g.description, g.category, g.horizon, to_char(g.target_date,'YYYY-MM-DD') AS target_date, g.status,
  g.metric_unit, g.metric_start::float8 AS metric_start, g.metric_target::float8 AS metric_target, g.metric_current::float8 AS metric_current,
  g.created_at, g.updated_at,
  (SELECT count(*)::int FROM tasks t WHERE t.goal_id = g.id AND t.status IN ('open','in_progress')) AS open_tasks,
  (SELECT count(*)::int FROM tasks t WHERE t.goal_id = g.id AND t.status = 'done') AS done_tasks
  FROM goals g`;

/** Progress: metric if defined, else milestones, else linked tasks, else null (unknown – deliberately not 0%). */
export function goalProgress(g: Goal): number | null {
  if (g.metric_target != null && g.metric_current != null) {
    const start = g.metric_start ?? 0;
    const span = g.metric_target - start;
    if (span === 0) return g.metric_current >= g.metric_target ? 1 : 0;
    return Math.max(0, Math.min(1, (g.metric_current - start) / span));
  }
  if (g.milestones?.length) return g.milestones.filter((m) => m.done_at).length / g.milestones.length;
  const total = (g.open_tasks ?? 0) + (g.done_tasks ?? 0);
  if (total) return (g.done_tasks ?? 0) / total;
  return null;
}

export async function listGoals(opts: { status?: string; workspaceId?: string } = {}): Promise<Goal[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.status) { params.push(opts.status); where.push(`g.status = $${params.length}`); }
  if (opts.workspaceId) { params.push(opts.workspaceId); where.push(`g.workspace_id = $${params.length}`); }
  const goals = await db.query<Goal>(`${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE g.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, g.target_date NULLS LAST, g.created_at`, params);
  if (!goals.length) return goals;
  const ms = await db.query<Milestone>(
    `SELECT id, goal_id, title, to_char(due_date,'YYYY-MM-DD') AS due_date, done_at, position FROM milestones
     WHERE goal_id = ANY($1::uuid[]) ORDER BY position, created_at`, [goals.map((g) => g.id)]);
  for (const g of goals) {
    g.milestones = ms.filter((m) => m.goal_id === g.id);
    g.progress = goalProgress(g);
  }
  return goals;
}

export async function createGoal(raw: z.input<typeof goalInput>, actor: string): Promise<Goal> {
  const g = goalInput.parse(raw);
  const db = await getDb();
  const id = await db.transaction(async (tx) => {
    const [row] = await tx.query<{ id: string }>(
      `INSERT INTO goals (workspace_id, title, description, category, horizon, target_date, metric_unit, metric_start, metric_target, metric_current)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [g.workspaceId, g.title, g.description, g.category, g.horizon, g.targetDate ?? null, g.metricUnit ?? null,
        g.metricStart ?? null, g.metricTarget ?? null, g.metricCurrent ?? g.metricStart ?? null]);
    for (const [i, m] of g.milestones.entries()) {
      await tx.query(`INSERT INTO milestones (goal_id, title, due_date, position) VALUES ($1,$2,$3,$4)`, [row.id, m.title, m.dueDate ?? null, i]);
    }
    return row.id;
  });
  await audit({ actor, action: "goal.create", target: id, workspaceId: g.workspaceId, level: 3, details: { title: g.title } });
  return (await listGoals()).find((x) => x.id === id)!;
}

export async function updateGoal(id: string, raw: z.input<typeof goalPatch>, actor: string) {
  const p = goalPatch.parse(raw);
  const db = await getDb();
  const map: Record<string, unknown> = {
    title: p.title, description: p.description, category: p.category, horizon: p.horizon, target_date: p.targetDate,
    metric_unit: p.metricUnit, metric_start: p.metricStart, metric_target: p.metricTarget, metric_current: p.metricCurrent, status: p.status,
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(map)) if (v !== undefined) { params.push(v); sets.push(`${k} = $${params.length}`); }
  if (!sets.length) return;
  const rows = await db.query(`UPDATE goals SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING id`, params);
  if (!rows.length) throw new Error("Ziel nicht gefunden");
  await audit({ actor, action: "goal.update", target: id, level: 3, details: { fields: Object.keys(p) } });
}

export async function deleteGoal(id: string, actor: string) {
  const db = await getDb();
  const rows = await db.query<{ title: string }>(`DELETE FROM goals WHERE id = $1 RETURNING title`, [id]);
  if (!rows.length) throw new Error("Ziel nicht gefunden");
  await audit({ actor, action: "goal.delete", target: id, level: 3, details: { title: rows[0].title } });
}

export async function addMilestone(goalId: string, title: string, dueDate: string | null) {
  const db = await getDb();
  await db.query(
    `INSERT INTO milestones (goal_id, title, due_date, position)
     VALUES ($1,$2,$3,(SELECT coalesce(max(position)+1,0) FROM milestones WHERE goal_id=$1))`, [goalId, title, dueDate]);
  await audit({ actor: "owner", action: "milestone.create", target: goalId, level: 3, details: { title } });
}

export async function toggleMilestone(id: string, done: boolean) {
  const db = await getDb();
  const rows = await db.query(`UPDATE milestones SET done_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1 RETURNING id`, [id, done]);
  if (!rows.length) throw new Error("Meilenstein nicht gefunden");
  await audit({ actor: "owner", action: done ? "milestone.done" : "milestone.reopen", target: id, level: 3 });
}

export async function deleteMilestone(id: string) {
  const db = await getDb();
  await db.query(`DELETE FROM milestones WHERE id = $1`, [id]);
  await audit({ actor: "owner", action: "milestone.delete", target: id, level: 3 });
}

/**
 * "Are my activities connected to my goals?" – share of tasks completed in the last 7 days that are
 * linked to a goal, a course, or belong to a business workspace.
 */
export async function goalAlignment() {
  const db = await getDb();
  const [r] = await db.query<{ done: number; aligned: number }>(
    `SELECT count(*)::int AS done,
       count(*) FILTER (WHERE goal_id IS NOT NULL OR course_id IS NOT NULL OR workspace_id <> 'personal')::int AS aligned
     FROM tasks WHERE status = 'done' AND completed_at > now() - interval '7 days'`);
  return { ...r, ratio: r.done ? r.aligned / r.done : null };
}
