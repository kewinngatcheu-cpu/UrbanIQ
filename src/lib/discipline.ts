import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { addDays, berlinDay, daysBetween, weekStart } from "@/lib/time";
import { createTask, updateTask, type Task } from "@/lib/tasks";

/* ───────────────────────────── Habits ───────────────────────────── */

export interface Habit {
  id: string; title: string; category: string; target_per_week: number; active: boolean; goal_id: string | null;
  days: string[];        // check-in days within the requested window
  streak: number;        // consecutive days up to today (or yesterday if today not yet done)
  week_done: number;     // check-ins in the current ISO week
  consistency30: number; // check-ins in last 30 days / expected (target_per_week * 30/7)
}

export const habitInput = z.object({
  title: z.string().min(1).max(120),
  category: z.string().max(40).default("personal"),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
  goalId: z.string().uuid().nullish(),
});

export function streakOf(days: Set<string>, today: string): number {
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export async function listHabits(today = berlinDay()): Promise<Habit[]> {
  const db = await getDb();
  const habits = await db.query<Omit<Habit, "days" | "streak" | "week_done" | "consistency30"> & { since: string }>(
    `SELECT id, title, category, target_per_week, active, goal_id, to_char((created_at AT TIME ZONE 'Europe/Berlin')::date,'YYYY-MM-DD') AS since
     FROM habits WHERE active ORDER BY created_at`);
  if (!habits.length) return [];
  const from = addDays(today, -120);
  const checks = await db.query<{ habit_id: string; day: string }>(
    `SELECT habit_id, to_char(day,'YYYY-MM-DD') AS day FROM habit_checkins WHERE day >= $1 AND habit_id = ANY($2::uuid[])`,
    [from, habits.map((h) => h.id)]);
  const ws = weekStart(today);
  const from30 = addDays(today, -29);
  return habits.map(({ since, ...h }) => {
    const days = checks.filter((c) => c.habit_id === h.id).map((c) => c.day);
    const set = new Set(days);
    const last30 = days.filter((d) => d >= from30 && d <= today).length;
    // Measure only over the days the habit has existed (max 30) – a new habit must not look like a failure.
    const window = Math.max(1, Math.min(30, daysBetween(since, today) + 1));
    return {
      ...h, days,
      streak: streakOf(set, today),
      week_done: days.filter((d) => d >= ws && d <= today).length,
      consistency30: Math.min(1, last30 / Math.max(1, (h.target_per_week * window) / 7)),
    };
  });
}

export async function createHabit(raw: z.input<typeof habitInput>) {
  const h = habitInput.parse(raw);
  const db = await getDb();
  const [row] = await db.query<{ id: string }>(
    `INSERT INTO habits (title, category, target_per_week, goal_id) VALUES ($1,$2,$3,$4) RETURNING id`,
    [h.title, h.category, h.targetPerWeek, h.goalId ?? null]);
  await audit({ actor: "owner", action: "habit.create", target: row.id, workspaceId: "personal", level: 3, details: { title: h.title } });
  return row;
}

export async function archiveHabit(id: string) {
  const db = await getDb();
  await db.query(`UPDATE habits SET active = false WHERE id = $1`, [id]);
  await audit({ actor: "owner", action: "habit.archive", target: id, workspaceId: "personal", level: 3 });
}

/** Toggle a check-in. Only today and the previous 6 days can be changed (no rewriting of history). */
export async function toggleCheckin(habitId: string, day: string, done: boolean, today = berlinDay()) {
  if (day > today || day < addDays(today, -6)) throw new Error("Nur die letzten 7 Tage können geändert werden.");
  const db = await getDb();
  if (done) await db.query(`INSERT INTO habit_checkins (habit_id, day) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [habitId, day]);
  else await db.query(`DELETE FROM habit_checkins WHERE habit_id = $1 AND day = $2`, [habitId, day]);
  await audit({ actor: "owner", action: done ? "habit.checkin" : "habit.uncheck", target: habitId, workspaceId: "personal", level: 3, details: { day } });
}

/* ───────────────────────────── Focus sessions ───────────────────────────── */

export interface FocusSession {
  id: string; task_id: string | null; task_title: string | null; workspace_id: string | null; label: string;
  planned_min: number; started_at: string; ended_at: string | null; actual_min: number | null; completed: boolean | null; note: string | null;
}

export const focusStartInput = z.object({
  taskId: z.string().uuid().nullish(),
  label: z.string().max(200).default(""),
  plannedMin: z.number().int().min(5).max(240).default(50),
});

export async function activeFocus(): Promise<FocusSession | null> {
  const db = await getDb();
  const [s] = await db.query<FocusSession>(
    `SELECT f.*, t.title AS task_title FROM focus_sessions f LEFT JOIN tasks t ON t.id = f.task_id WHERE f.ended_at IS NULL ORDER BY f.started_at DESC LIMIT 1`);
  return s ?? null;
}

export async function startFocus(raw: z.input<typeof focusStartInput>) {
  const p = focusStartInput.parse(raw);
  if (await activeFocus()) throw new Error("Es läuft bereits eine Fokus-Session.");
  const db = await getDb();
  let workspaceId: string | null = null;
  if (p.taskId) {
    const [t] = await db.query<{ workspace_id: string; status: string }>(`SELECT workspace_id, status FROM tasks WHERE id = $1`, [p.taskId]);
    if (!t) throw new Error("Aufgabe nicht gefunden");
    workspaceId = t.workspace_id;
    if (t.status === "open") await db.query(`UPDATE tasks SET status = 'in_progress', updated_at = now() WHERE id = $1`, [p.taskId]);
  }
  const [s] = await db.query<{ id: string }>(
    `INSERT INTO focus_sessions (task_id, workspace_id, label, planned_min) VALUES ($1,$2,$3,$4) RETURNING id`,
    [p.taskId ?? null, workspaceId, p.label, p.plannedMin]);
  await audit({ actor: "owner", action: "focus.start", target: s.id, workspaceId, level: 3, details: { plannedMin: p.plannedMin } });
  return s;
}

export async function stopFocus(id: string, opts: { completed: boolean; note?: string; taskDone?: boolean }) {
  const db = await getDb();
  const [s] = await db.query<{ task_id: string | null; workspace_id: string | null; actual_min: number }>(
    `UPDATE focus_sessions SET ended_at = now(), completed = $2, note = $3,
       actual_min = GREATEST(1, round(extract(epoch FROM (now() - started_at)) / 60))::int
     WHERE id = $1 AND ended_at IS NULL RETURNING task_id, workspace_id, actual_min`, [id, opts.completed, opts.note ?? null]);
  if (!s) throw new Error("Keine laufende Session mit dieser ID.");
  if (opts.taskDone && s.task_id) await updateTask(s.task_id, { status: "done" }, "owner");
  await audit({ actor: "owner", action: "focus.stop", target: id, workspaceId: s.workspace_id, level: 3, details: { minutes: s.actual_min, completed: opts.completed } });
  return s;
}

export async function focusStats(today = berlinDay()) {
  const db = await getDb();
  const [r] = await db.query<{ today_min: number; week_min: number; sessions_week: number; completed_week: number }>(
    `SELECT
       coalesce(sum(actual_min) FILTER (WHERE (started_at AT TIME ZONE 'Europe/Berlin')::date = $1::date), 0)::int AS today_min,
       coalesce(sum(actual_min) FILTER (WHERE (started_at AT TIME ZONE 'Europe/Berlin')::date >= $2::date), 0)::int AS week_min,
       count(*) FILTER (WHERE (started_at AT TIME ZONE 'Europe/Berlin')::date >= $2::date AND ended_at IS NOT NULL)::int AS sessions_week,
       count(*) FILTER (WHERE (started_at AT TIME ZONE 'Europe/Berlin')::date >= $2::date AND completed)::int AS completed_week
     FROM focus_sessions WHERE ended_at IS NOT NULL`, [today, weekStart(today)]);
  const byWorkspace = await db.query<{ workspace_id: string | null; minutes: number }>(
    `SELECT workspace_id, sum(actual_min)::int AS minutes FROM focus_sessions
     WHERE ended_at IS NOT NULL AND (started_at AT TIME ZONE 'Europe/Berlin')::date >= $1::date GROUP BY workspace_id ORDER BY minutes DESC`,
    [weekStart(today)]);
  return { ...r, byWorkspace };
}

export async function recentFocus(limit = 10): Promise<FocusSession[]> {
  const db = await getDb();
  return db.query<FocusSession>(
    `SELECT f.*, t.title AS task_title FROM focus_sessions f LEFT JOIN tasks t ON t.id = f.task_id
     WHERE f.ended_at IS NOT NULL ORDER BY f.started_at DESC LIMIT $1`, [limit]);
}

/* ───────────────────────────── Procrastination ───────────────────────────── */

export const BLOCKER_REASONS = {
  unclear: { label: "Unklar, was genau zu tun ist", advice: "Formuliere den ersten physischen Schritt (Verb + Objekt, max. 25 Minuten). Unklarheit ist der häufigste Grund für Aufschieben." },
  overload: { label: "Zu viele Aufgaben gleichzeitig", advice: "Entscheide bewusst: Diese Aufgabe in die Top 3 von morgen – oder zwei andere Aufgaben streichen bzw. verschieben." },
  unrealistic: { label: "Unrealistisch geplant", advice: "Neue Deadline mit Puffer setzen und die Aufgabe in Teilschritte zerlegen. Plane 1,5× der geschätzten Zeit ein." },
  motivation: { label: "Fehlende Motivation", advice: "Verbinde die Aufgabe mit einem Ziel – oder prüfe ehrlich, ob sie überhaupt nötig ist. Starte mit einer 15-Minuten-Fokus-Session." },
  resources: { label: "Fehlende Ressourcen / Informationen", advice: "Lege eine Aufgabe für die Beschaffung an (wen fragen, was besorgen) und blockiere die Hauptaufgabe bis dahin bewusst." },
  priority: { label: "Eigentlich nicht wichtig", advice: "Streichen oder auf niedrige Priorität setzen. Aufschieben ist manchmal das richtige Signal." },
} as const;
export type BlockerReason = keyof typeof BLOCKER_REASONS;

/** Tasks that keep getting postponed (≥2 moved deadlines) or are overdue for more than 3 days. */
export async function procrastinationCandidates(): Promise<Task[]> {
  const db = await getDb();
  return db.query<Task>(
    `SELECT * FROM tasks WHERE status IN ('open','in_progress')
       AND (postponed_count >= 2 OR due_at < now() - interval '3 days')
     ORDER BY postponed_count DESC, due_at NULLS LAST LIMIT 20`);
}

/** Record the root cause and apply the matching structural fix (each step is a real, audited change). */
export async function resolveProcrastination(taskId: string, reason: BlockerReason, opts: { nextStep?: string }) {
  const db = await getDb();
  const [t] = await db.query<Task>(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  if (!t) throw new Error("Aufgabe nicht gefunden");
  await db.query(`UPDATE tasks SET blocker_reason = $2, updated_at = now() WHERE id = $1`, [taskId, reason]);
  const actions: string[] = [];
  if (opts.nextStep?.trim()) {
    const sub = await createTask({ workspaceId: t.workspace_id, title: `Nächster Schritt: ${opts.nextStep.trim()}`, priority: t.priority === "low" ? "medium" : t.priority,
      dueAt: new Date(Date.now() + 864e5).toISOString(), estimateMin: 25 }, "owner");
    await db.query(`UPDATE tasks SET parent_id = $2 WHERE id = $1`, [sub.id, taskId]);
    actions.push("next_step_created");
  }
  if (reason === "priority") { await updateTask(taskId, { priority: "low" }, "owner"); actions.push("priority_lowered"); }
  await audit({ actor: "owner", action: "task.blocker", target: taskId, workspaceId: t.workspace_id, level: 3, details: { reason, actions } });
  return { advice: BLOCKER_REASONS[reason].advice, actions };
}

export async function blockerPatterns() {
  const db = await getDb();
  return db.query<{ reason: string; n: number }>(
    `SELECT blocker_reason AS reason, count(*)::int AS n FROM tasks WHERE blocker_reason IS NOT NULL GROUP BY 1 ORDER BY n DESC`);
}
