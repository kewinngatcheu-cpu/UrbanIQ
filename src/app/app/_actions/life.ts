"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser, AuthError } from "@/lib/auth";
import { userDb } from "@/lib/db";
import type { Recurrence, Task } from "@/lib/db/types";
import { requireFeature } from "@/lib/permissions/entitlements";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title.").max(200),
  notes: z.string().max(5000),
  kind: z.enum(["task", "appointment", "deadline"]),
  priority: z.enum(["low", "normal", "high"]),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
});

/** Converts the browser-local date/time to an absolute instant using the browser's UTC offset. */
function toIso(date: string, time: string, tzOffset: string): string | null {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AuthError("Please enter a valid date.");
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  const offset = Number.isFinite(Number(tzOffset)) && Math.abs(Number(tzOffset)) <= 840 ? Number(tzOffset) : 0;
  const ms = Date.parse(`${date}T${t}:00Z`) + offset * 60_000;
  if (Number.isNaN(ms)) throw new AuthError("Please enter a valid date.");
  return new Date(ms).toISOString();
}

async function refs(db: Awaited<ReturnType<typeof userDb>>, form: FormData) {
  const project = fd(form, "project_id");
  const category = fd(form, "category_id");
  if (project && !(await db.get("projects", project))) throw new AuthError("Unknown project.");
  if (category && !(await db.get("categories", category))) throw new AuthError("Unknown category.");
  return { project_id: project || null, category_id: category || null };
}

export async function saveTask(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const p = taskSchema.parse({
      title: fd(form, "title"),
      notes: fd(form, "notes"),
      kind: fd(form, "kind") || "task",
      priority: fd(form, "priority") || "normal",
      recurrence: fd(form, "recurrence") || "none",
    });
    if (p.recurrence !== "none") requireFeature(user, "recurringTasks");
    const due_at = toIso(fd(form, "date"), fd(form, "time"), fd(form, "tz_offset"));
    if (p.recurrence !== "none" && !due_at) throw new AuthError("Recurring tasks need a start date.");
    const r = await refs(db, form);
    const id = fd(form, "id");
    if (id) {
      const updated = await db.update("tasks", id, { ...p, notes: p.notes || null, due_at, ...r });
      if (!updated) throw new AuthError("Task not found.");
    } else {
      await db.insert("tasks", { ...p, notes: p.notes || null, due_at, ...r, status: "open", source_memory_id: null, completed_at: null });
    }
    if (form.get("remind") === "on" && due_at) {
      await db.insert("reminders", { title: p.title, remind_at: new Date(Date.parse(due_at) - 60 * 60 * 1000).toISOString(), done: false, task_id: null });
    }
    revalidatePath("/app", "layout");
    return { ok: true, message: id ? "Updated." : "Added.", ts: Date.now() };
  });
}

function nextOccurrence(iso: string, r: Recurrence): string {
  const d = new Date(iso);
  if (r === "daily") d.setDate(d.getDate() + 1);
  if (r === "weekly") d.setDate(d.getDate() + 7);
  if (r === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function toggleTask(form: FormData) {
  const user = await assertUser();
  const db = await userDb(user.id);
  const t = await db.get("tasks", fd(form, "id"));
  if (!t) return;
  if (t.status === "open") {
    await db.update("tasks", t.id, { status: "done", completed_at: new Date().toISOString() });
    if (t.recurrence !== "none" && t.due_at) {
      const next: Omit<Task, "id" | "user_id" | "created_at" | "updated_at"> = {
        kind: t.kind, title: t.title, notes: t.notes, due_at: nextOccurrence(t.due_at, t.recurrence), priority: t.priority,
        status: "open", recurrence: t.recurrence, project_id: t.project_id, category_id: t.category_id, source_memory_id: t.source_memory_id, completed_at: null,
      };
      await db.insert("tasks", next);
    }
  } else {
    await db.update("tasks", t.id, { status: "open", completed_at: null });
  }
  revalidatePath("/app", "layout");
}

export async function deleteTask(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    if (!(await db.remove("tasks", fd(form, "id")))) throw new AuthError("Task not found.");
    revalidatePath("/app", "layout");
  });
}

export async function saveReminder(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const title = z.string().trim().min(1, "Please enter a title.").max(200).parse(fd(form, "title"));
    const at = toIso(fd(form, "date"), fd(form, "time"), fd(form, "tz_offset"));
    if (!at) throw new AuthError("Please choose a date.");
    await db.insert("reminders", { title, remind_at: at, done: false, task_id: null });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Reminder set.", ts: Date.now() };
  });
}

export async function toggleReminder(form: FormData) {
  const user = await assertUser();
  const db = await userDb(user.id);
  const r = await db.get("reminders", fd(form, "id"));
  if (r) await db.update("reminders", r.id, { done: !r.done });
  revalidatePath("/app", "layout");
}

export async function deleteReminder(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    await db.remove("reminders", fd(form, "id"));
    revalidatePath("/app", "layout");
  });
}

const COLORS = ["#6aafe8", "#5bbf94", "#8b7fe0", "#e8a26a", "#e88a9a", "#e8c46a", "#438ed4", "#7cc7a4"];

export async function saveProject(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const name = z.string().trim().min(1, "Please enter a name.").max(120).parse(fd(form, "name"));
    const kind = fd(form, "kind") === "goal" ? "goal" : "project";
    const color = COLORS.includes(fd(form, "color")) ? fd(form, "color") : COLORS[Math.floor(Math.random() * COLORS.length)];
    const target = fd(form, "target_date");
    await db.insert("projects", {
      kind, name, description: fd(form, "description").slice(0, 2000) || null, color, status: "active",
      target_date: target && /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : null,
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: kind === "goal" ? "Goal created." : "Project created.", ts: Date.now() };
  });
}

export async function archiveProject(form: FormData) {
  const user = await assertUser();
  const db = await userDb(user.id);
  const p = await db.get("projects", fd(form, "id"));
  if (p) await db.update("projects", p.id, { status: p.status === "active" ? "archived" : "active" });
  revalidatePath("/app", "layout");
}

export async function deleteProject(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const id = fd(form, "id");
    await db.updateWhere("tasks", { project_id: id }, { project_id: null });
    await db.remove("projects", id);
    revalidatePath("/app", "layout");
  });
}

export async function saveCategory(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const name = z.string().trim().min(1, "Please enter a name.").max(40).parse(fd(form, "name"));
    if ((await db.select("categories")).some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new AuthError("You already have a category with that name.");
    const color = COLORS.includes(fd(form, "color")) ? fd(form, "color") : COLORS[0];
    await db.insert("categories", { name, color });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Category created.", ts: Date.now() };
  });
}

export async function deleteCategory(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const id = fd(form, "id");
    await db.updateWhere("tasks", { category_id: id }, { category_id: null });
    await db.updateWhere("memories", { category_id: id }, { category_id: null });
    await db.remove("categories", id);
    revalidatePath("/app", "layout");
  });
}
