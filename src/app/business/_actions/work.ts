"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError } from "@/lib/auth";
import { assertOrg, logActivity, type OrgContext } from "@/lib/org";
import { assertProjectCapacity, requireFeature, assertWritable } from "@/lib/permissions/entitlements";
import { systemDb } from "@/lib/db";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import type { Recurrence, Task } from "@/lib/db/types";

const B = "/business";

function toIso(date: string, time: string, tzOffset: string): string | null {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AuthError("Please enter a valid date.");
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  const offset = Number.isFinite(Number(tzOffset)) && Math.abs(Number(tzOffset)) <= 840 ? Number(tzOffset) : 0;
  return new Date(Date.parse(`${date}T${t}:00Z`) + offset * 60_000).toISOString();
}

async function assertMember(ctx: OrgContext, userId: string) {
  if (!userId) return null;
  const m = await systemDb().selectOne("organization_members", { org_id: ctx.org.id, user_id: userId, status: "active" });
  if (!m) throw new AuthError("That person is not a member of this company.");
  return userId;
}

// ───────────────────────── Projects ─────────────────────────

const projectSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name.").max(120),
  description: z.string().max(4000),
  stage: z.enum(["planned", "active", "on_hold", "done"]),
});

export async function saveProject(_: ActionState, form: FormData): Promise<ActionState> {
  let newId = "";
  const res = await run(async () => {
    const ctx = await assertOrg("projects.manage");
    await requireFeature(ctx.ent, "projects");
    await assertWritable(ctx.ent);
    const p = projectSchema.parse({ name: fd(form, "name"), description: fd(form, "description"), stage: fd(form, "stage") || "planned" });
    const lead = await assertMember(ctx, fd(form, "lead_id"));
    const clientId = fd(form, "client_id");
    if (clientId && !(await ctx.db.get("clients", clientId))) throw new AuthError("Unknown client.");
    const target = fd(form, "target_date");
    const fields = {
      kind: "project" as const, name: p.name, description: p.description || null, stage: p.stage, lead_id: lead, client_id: clientId || null,
      target_date: /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : null,
    };
    const id = fd(form, "id");
    if (id) {
      const before = await ctx.db.get("projects", id);
      if (!before) throw new AuthError("Project not found.");
      await ctx.db.update("projects", id, fields);
      await logActivity(ctx, "project", id, "updated", before.stage !== p.stage ? `Project “${p.name}” moved to ${p.stage}` : `Project “${p.name}” was updated`, id);
      newId = id;
    } else {
      await assertProjectCapacity(ctx.ent);
      const created = await ctx.db.insert("projects", { ...fields, color: "#438ed4", status: "active" });
      await logActivity(ctx, "project", created.id, "created", `Project “${p.name}” was created`, created.id);
      newId = created.id;
    }
  });
  if (res.error) return res;
  revalidatePath(B, "layout");
  return { ok: true, message: "Saved.", data: { id: newId }, ts: Date.now() };
}

export async function archiveProject(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("projects.manage");
    const p = await ctx.db.get("projects", fd(form, "id"));
    if (!p) throw new AuthError("Project not found.");
    await ctx.db.update("projects", p.id, { status: p.status === "active" ? "archived" : "active" });
    await logActivity(ctx, "project", p.id, p.status === "active" ? "archived" : "restored", `Project “${p.name}” was ${p.status === "active" ? "archived" : "restored"}`, p.id);
    revalidatePath(B, "layout");
  });
}

// ───────────────────────── Tasks ─────────────────────────

const taskSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title.").max(200),
  notes: z.string().max(5000),
  kind: z.enum(["task", "appointment", "deadline"]),
  priority: z.enum(["low", "normal", "high"]),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
});

function canEditTask(ctx: OrgContext, t: Pick<Task, "user_id" | "assignee_id">) {
  return ctx.can("tasks.manage") || (ctx.can("tasks.update_own") && (t.user_id === ctx.user.id || t.assignee_id === ctx.user.id));
}

export async function saveTask(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("tasks.create");
    await assertWritable(ctx.ent);
    const p = taskSchema.parse({ title: fd(form, "title"), notes: fd(form, "notes"), kind: fd(form, "kind") || "task", priority: fd(form, "priority") || "normal", recurrence: fd(form, "recurrence") || "none" });
    if (p.recurrence !== "none") await requireFeature(ctx.ent, "workflows");
    const due_at = toIso(fd(form, "date"), fd(form, "time"), fd(form, "tz_offset"));
    if (p.recurrence !== "none" && !due_at) throw new AuthError("Recurring tasks need a start date.");
    let assignee = await assertMember(ctx, fd(form, "assignee_id"));
    if (assignee && assignee !== ctx.user.id) {
      await requireFeature(ctx.ent, "team");
      if (!ctx.can("tasks.manage")) throw new AuthError("Only managers can assign tasks to other people.");
    }
    const projectId = fd(form, "project_id");
    if (projectId && !(await ctx.db.get("projects", projectId))) throw new AuthError("Unknown project.");
    const parentId = fd(form, "parent_id");
    if (parentId) {
      const parent = await ctx.db.get("tasks", parentId);
      if (!parent) throw new AuthError("Parent task not found.");
      if (parent.parent_id) throw new AuthError("Sub-tasks can't have their own sub-tasks.");
    }
    const id = fd(form, "id");
    if (id) {
      const before = await ctx.db.get("tasks", id);
      if (!before) throw new AuthError("Task not found.");
      if (!canEditTask(ctx, before)) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
      if (!ctx.can("tasks.manage")) assignee = before.assignee_id ?? null; // employees can't reassign
      await ctx.db.update("tasks", id, { ...p, notes: p.notes || null, due_at, assignee_id: assignee, project_id: projectId || null });
      await logActivity(ctx, "task", id, "updated", `Task “${p.title}” was updated`, projectId || null);
    } else {
      const t = await ctx.db.insert("tasks", {
        ...p, notes: p.notes || null, due_at, status: "open", project_id: projectId || null, category_id: null, source_memory_id: null,
        completed_at: null, assignee_id: assignee ?? ctx.user.id, parent_id: parentId || null,
      });
      await logActivity(ctx, "task", t.id, "created", `Task “${p.title}” was created${assignee && assignee !== ctx.user.id ? " and assigned" : ""}`, projectId || null);
    }
    revalidatePath(B, "layout");
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

export async function toggleTask(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("tasks.view");
    const t = await ctx.db.get("tasks", fd(form, "id"));
    if (!t) throw new AuthError("Task not found.");
    if (!canEditTask(ctx, t)) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
    await assertWritable(ctx.ent);
    if (t.status === "open") {
      await ctx.db.update("tasks", t.id, { status: "done", completed_at: new Date().toISOString() });
      if (t.recurrence !== "none" && t.due_at) {
        await ctx.db.insert("tasks", {
          kind: t.kind, title: t.title, notes: t.notes, due_at: nextOccurrence(t.due_at, t.recurrence), priority: t.priority, status: "open",
          recurrence: t.recurrence, project_id: t.project_id, category_id: null, source_memory_id: null, completed_at: null, assignee_id: t.assignee_id, parent_id: t.parent_id ?? null,
        });
      }
      await logActivity(ctx, "task", t.id, "completed", `Task “${t.title}” was completed`, t.project_id);
    } else {
      await ctx.db.update("tasks", t.id, { status: "open", completed_at: null });
      await logActivity(ctx, "task", t.id, "reopened", `Task “${t.title}” was reopened`, t.project_id);
    }
    revalidatePath(B, "layout");
  });
}

export async function deleteTask(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("tasks.view");
    const t = await ctx.db.get("tasks", fd(form, "id"));
    if (!t) throw new AuthError("Task not found.");
    if (!ctx.can("tasks.manage") && t.user_id !== ctx.user.id) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
    await ctx.db.removeWhere("tasks", { parent_id: t.id });
    await ctx.db.remove("tasks", t.id);
    await logActivity(ctx, "task", t.id, "deleted", `Task “${t.title}” was deleted`, t.project_id);
    revalidatePath(B, "layout");
  });
}

// ───────────────────────── Clients ─────────────────────────

export async function saveClient(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("clients.manage");
    await assertWritable(ctx.ent);
    const name = z.string().trim().min(1, "Please enter a name.").max(120).parse(fd(form, "name"));
    const c = await ctx.db.insert("clients", { org_id: ctx.org.id, name, contact: fd(form, "contact").slice(0, 200) || null, notes: fd(form, "notes").slice(0, 2000) || null });
    await logActivity(ctx, "client", c.id, "created", `Client “${name}” was added`);
    revalidatePath(B, "layout");
    return { ok: true, message: "Client added.", ts: Date.now() };
  });
}

export async function deleteClient(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("clients.manage");
    const id = fd(form, "id");
    const c = await ctx.db.get("clients", id);
    if (!c) throw new AuthError("Client not found.");
    await ctx.db.updateWhere("memories", { client_id: id }, { client_id: null });
    await ctx.db.updateWhere("projects", { client_id: id }, { client_id: null });
    await ctx.db.remove("clients", id);
    await logActivity(ctx, "client", id, "deleted", `Client “${c.name}” was removed`);
    revalidatePath(B, "layout");
  });
}

/** Plain form-action wrappers (no return value) for one-click buttons. */
export async function toggleTaskForm(form: FormData) {
  await toggleTask({}, form);
}
export async function archiveProjectForm(form: FormData) {
  await archiveProject({}, form);
}
