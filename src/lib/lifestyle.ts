import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { addDays, berlinDay, daysBetween, weekStart } from "@/lib/time";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/* ───────────────────────────── Fitness ───────────────────────────── */

export const WORKOUT_TYPES = ["Krafttraining", "Laufen", "Radfahren", "Schwimmen", "Mobility", "Kampfsport", "Mannschaftssport", "Sonstiges"];
export const METRICS: Record<string, { label: string; unit: string }> = {
  weight_kg: { label: "Gewicht", unit: "kg" },
  body_fat_pct: { label: "Körperfett", unit: "%" },
  waist_cm: { label: "Taillenumfang", unit: "cm" },
  resting_hr: { label: "Ruhepuls", unit: "bpm" },
  sleep_h: { label: "Schlaf (Ø)", unit: "h" },
};
/** Measurements older than this are flagged as possibly outdated – JARVIS must not treat them as current. */
export const MEASUREMENT_STALE_DAYS = 30;

export const workoutInput = z.object({
  day, type: z.string().min(1).max(60), durationMin: z.number().int().min(1).max(600).nullish(),
  intensity: z.number().int().min(1).max(5).nullish(), notes: z.string().max(2000).default(""),
});
export const measurementInput = z.object({ day, metric: z.string().refine((m) => m in METRICS, "Unbekannte Messgröße"), value: z.number().min(0).max(1000) });

export async function addWorkout(raw: z.input<typeof workoutInput>) {
  const w = workoutInput.parse(raw);
  const db = await getDb();
  const [r] = await db.query<{ id: string }>(
    `INSERT INTO fitness_workouts (day, type, duration_min, intensity, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [w.day, w.type, w.durationMin ?? null, w.intensity ?? null, w.notes]);
  await audit({ actor: "owner", action: "fitness.workout.create", target: r.id, workspaceId: "personal", level: 3 });
  return r;
}

export async function deleteWorkout(id: string) {
  const db = await getDb();
  await db.query(`DELETE FROM fitness_workouts WHERE id = $1`, [id]);
  await audit({ actor: "owner", action: "fitness.workout.delete", target: id, workspaceId: "personal", level: 3 });
}

export async function addMeasurement(raw: z.input<typeof measurementInput>) {
  const m = measurementInput.parse(raw);
  const db = await getDb();
  await db.query(`INSERT INTO body_measurements (day, metric, value) VALUES ($1,$2,$3)`, [m.day, m.metric, m.value]);
  await audit({ actor: "owner", action: "fitness.measurement.create", workspaceId: "personal", level: 3, details: { metric: m.metric } });
}

export async function fitnessOverview(today = berlinDay()) {
  const db = await getDb();
  const workouts = await db.query<{ id: string; day: string; type: string; duration_min: number | null; intensity: number | null; notes: string }>(
    `SELECT id, to_char(day,'YYYY-MM-DD') AS day, type, duration_min, intensity, notes FROM fitness_workouts WHERE day >= $1 ORDER BY day DESC, created_at DESC`,
    [addDays(today, -56)]);
  const latest = await db.query<{ metric: string; day: string; value: number }>(
    `SELECT DISTINCT ON (metric) metric, to_char(day,'YYYY-MM-DD') AS day, value::float8 AS value FROM body_measurements ORDER BY metric, day DESC, created_at DESC`);
  const series = await db.query<{ metric: string; day: string; value: number }>(
    `SELECT metric, to_char(day,'YYYY-MM-DD') AS day, value::float8 AS value FROM body_measurements WHERE day >= $1 ORDER BY day`, [addDays(today, -180)]);
  const ws = weekStart(today);
  const weeks = [7, 6, 5, 4, 3, 2, 1, 0].map((i) => {
    const start = addDays(ws, -7 * i);
    const end = addDays(start, 6);
    const w = workouts.filter((x) => x.day >= start && x.day <= end);
    return { week: start, count: w.length, minutes: w.reduce((a, x) => a + (x.duration_min ?? 0), 0) };
  });
  return {
    workouts,
    weeks,
    thisWeek: weeks[weeks.length - 1],
    latest: latest.map((l) => ({ ...l, ageDays: daysBetween(l.day, today), stale: daysBetween(l.day, today) > MEASUREMENT_STALE_DAYS })),
    series,
  };
}

/* ───────────────────────────── University ───────────────────────────── */

export interface Course {
  id: string; name: string; semester: string | null; ects: number | null; exam_date: string | null; status: string;
  grade: number | null; notes: string; open_tasks: number; next_due: string | null;
}

export const courseInput = z.object({
  name: z.string().min(1).max(120), semester: z.string().max(30).nullish(), ects: z.number().min(0).max(60).nullish(),
  examDate: day.nullish(), notes: z.string().max(4000).default(""),
});
export const coursePatch = courseInput.partial().extend({
  status: z.enum(["active", "passed", "failed", "dropped"]).optional(),
  grade: z.number().min(1).max(5).nullable().optional(),
});

export async function listCourses(): Promise<Course[]> {
  const db = await getDb();
  return db.query<Course>(
    `SELECT c.id, c.name, c.semester, c.ects::float8 AS ects, to_char(c.exam_date,'YYYY-MM-DD') AS exam_date, c.status, c.grade::float8 AS grade, c.notes,
       (SELECT count(*)::int FROM tasks t WHERE t.course_id = c.id AND t.status IN ('open','in_progress')) AS open_tasks,
       (SELECT min(t.due_at) FROM tasks t WHERE t.course_id = c.id AND t.status IN ('open','in_progress')) AS next_due
     FROM courses c ORDER BY CASE c.status WHEN 'active' THEN 0 ELSE 1 END, c.exam_date NULLS LAST, c.name`);
}

export async function createCourse(raw: z.input<typeof courseInput>) {
  const c = courseInput.parse(raw);
  const db = await getDb();
  const [r] = await db.query<{ id: string }>(
    `INSERT INTO courses (name, semester, ects, exam_date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [c.name, c.semester ?? null, c.ects ?? null, c.examDate ?? null, c.notes]);
  await audit({ actor: "owner", action: "course.create", target: r.id, workspaceId: "personal", level: 3, details: { name: c.name } });
  return r;
}

export async function updateCourse(id: string, raw: z.input<typeof coursePatch>) {
  const p = coursePatch.parse(raw);
  const map: Record<string, unknown> = { name: p.name, semester: p.semester, ects: p.ects, exam_date: p.examDate, notes: p.notes, status: p.status, grade: p.grade };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [k, v] of Object.entries(map)) if (v !== undefined) { params.push(v); sets.push(`${k} = $${params.length}`); }
  if (!sets.length) return;
  const db = await getDb();
  const rows = await db.query(`UPDATE courses SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 RETURNING id`, params);
  if (!rows.length) throw new Error("Kurs nicht gefunden");
  await audit({ actor: "owner", action: "course.update", target: id, workspaceId: "personal", level: 3, details: { fields: Object.keys(p) } });
}

export async function deleteCourse(id: string) {
  const db = await getDb();
  await db.query(`DELETE FROM courses WHERE id = $1`, [id]);
  await audit({ actor: "owner", action: "course.delete", target: id, workspaceId: "personal", level: 3 });
}

/** ECTS-weighted grade average over passed courses with a grade (German scale, 1.0 = best). */
export function weightedGrade(courses: Pick<Course, "grade" | "ects" | "status">[]): { average: number | null; ects: number } {
  const graded = courses.filter((c) => c.status === "passed" && c.grade != null && (c.ects ?? 0) > 0);
  const ects = graded.reduce((a, c) => a + (c.ects ?? 0), 0);
  if (!ects) return { average: null, ects: 0 };
  return { average: Math.round((graded.reduce((a, c) => a + (c.grade ?? 0) * (c.ects ?? 0), 0) / ects) * 100) / 100, ects };
}
