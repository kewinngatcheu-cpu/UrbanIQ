"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertUser, AuthError } from "@/lib/auth";
import { userDb } from "@/lib/db";
import type { ActionStatus, ActionType } from "@/lib/db/types";
import { assertActionCapacity, personalEnt } from "@/lib/permissions/entitlements";
import { planAction, personalCtx } from "@/lib/ai/service";
import { ACTION_TYPES } from "@/lib/ai/templates";
import { audit } from "@/lib/audit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

const TYPES = ACTION_TYPES.map((a) => a.type) as [ActionType, ...ActionType[]];
const STATUSES: ActionStatus[] = ["new", "in_progress", "waiting", "waiting_external", "done"];

export async function createAction(_: ActionState, form: FormData): Promise<ActionState> {
  let id = "";
  const res = await run(async () => {
    const user = await assertUser();
    await assertActionCapacity(await personalEnt(user));
    const db = await userDb(user.id);
    const type = z.enum(TYPES).parse(fd(form, "type") || "custom");
    const title = z.string().trim().min(1, "Please describe what you need.").max(200).parse(fd(form, "title"));
    const description = z.string().max(10_000).parse(fd(form, "description"));
    const memoryId = fd(form, "memory_id");
    const memory = memoryId ? await db.get("memories", memoryId) : null;
    if (memoryId && !memory) throw new AuthError("Linked memory not found.");
    const plan = await planAction(await personalCtx(user), { type, title, description }, memory);
    const item = await db.insert("action_items", {
      type, title, description: description || null,
      status: plan.missing.length ? "waiting" : "new",
      steps: plan.steps.map((text) => ({ text, done: false })),
      draft: plan.draft, plan_source: plan.mode, missing_info: plan.missing,
      memory_id: memory?.id ?? null, external_confirmed_at: null,
    });
    id = item.id;
  });
  if (res.error) return res;
  revalidatePath("/app", "layout");
  redirect(`/app/action/${id}`);
}

export async function setActionStatus(form: FormData) {
  const user = await assertUser();
  const db = await userDb(user.id);
  const status = fd(form, "status") as ActionStatus;
  if (!STATUSES.includes(status)) return;
  await db.update("action_items", fd(form, "id"), { status });
  revalidatePath("/app", "layout");
}

export async function toggleStep(form: FormData) {
  const user = await assertUser();
  const db = await userDb(user.id);
  const a = await db.get("action_items", fd(form, "id"));
  const idx = Number(fd(form, "index"));
  if (!a || !Number.isInteger(idx) || !a.steps[idx]) return;
  const steps = a.steps.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
  const allDone = steps.every((s) => s.done);
  await db.update("action_items", a.id, {
    steps,
    status: a.status === "new" ? "in_progress" : allDone && a.status !== "waiting" ? a.status : a.status,
  });
  revalidatePath(`/app/action/${a.id}`);
}

export async function saveDraft(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const draft = z.string().max(20_000).parse(fd(form, "draft"));
    const missing = fd(form, "missing").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    const a = await db.update("action_items", fd(form, "id"), { draft, missing_info: missing });
    if (!a) throw new AuthError("Action not found.");
    revalidatePath(`/app/action/${a.id}`);
    return { ok: true, message: "Saved.", ts: Date.now() };
  });
}

export async function regeneratePlan(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const a = await db.get("action_items", fd(form, "id"));
    if (!a) throw new AuthError("Action not found.");
    const memory = a.memory_id ? await db.get("memories", a.memory_id) : null;
    const plan = await planAction(await personalCtx(user), a, memory);
    await db.update("action_items", a.id, {
      steps: plan.steps.map((text) => ({ text, done: false })),
      draft: plan.draft ?? a.draft, plan_source: plan.mode, missing_info: plan.missing,
    });
    revalidatePath(`/app/action/${a.id}`);
    return { ok: true, message: plan.mode === "ai" ? "New plan created." : "Plan refreshed from template.", ts: Date.now() };
  });
}

/**
 * The user explicitly confirms that THEY sent / executed the external step themselves.
 * ONE never performs binding external actions.
 */
export async function confirmExternal(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    if (fd(form, "confirm") !== "on") throw new AuthError("Please tick the box to confirm.");
    const a = await db.update("action_items", fd(form, "id"), { external_confirmed_at: new Date().toISOString(), status: "done" });
    if (!a) throw new AuthError("Action not found.");
    await audit(user.id, "action.external_confirmed", { type: "action", id: a.id }, { type: a.type });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Marked as done.", ts: Date.now() };
  });
}

export async function deleteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    if (!(await db.remove("action_items", fd(form, "id")))) throw new AuthError("Action not found.");
  });
  if (res.error) return res;
  revalidatePath("/app", "layout");
  redirect("/app/action");
}
