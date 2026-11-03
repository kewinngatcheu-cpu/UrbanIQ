"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthError } from "@/lib/auth";
import { assertOrg, logActivity, type OrgContext } from "@/lib/org";
import { assertCanStore, assertMemoryCapacity, assertActionCapacity, requireFeature } from "@/lib/permissions/entitlements";
import { summarize, extractTasks, planAction, askOne, canAnalyzeFile, recognizeFileText, type AiCtx } from "@/lib/ai/service";
import { BUSINESS_ACTION_TYPES } from "@/lib/ai/templates";
import { isEnabled } from "@/lib/features";
import { putFile, deleteFiles, getFile } from "@/lib/storage";
import { extractText, kindForMime, ALLOWED_MIME } from "@/lib/documents";
import { rateLimit } from "@/lib/auth/rate-limit";
import { fd, run } from "@/lib/safe-action";
import { parseTags } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";
import type { ActionStatus, ActionType, Source } from "@/lib/db/types";

const B = "/business";
const aiCtx = (ctx: OrgContext): AiCtx => ({ user: ctx.user, ent: ctx.ent, db: ctx.db, world: "business", orgName: ctx.org.name });

async function links(ctx: OrgContext, form: FormData) {
  const client = fd(form, "client_id");
  const project = fd(form, "project_id");
  if (client && !(await ctx.db.get("clients", client))) throw new AuthError("Unknown client.");
  if (project && !(await ctx.db.get("projects", project))) throw new AuthError("Unknown project.");
  return { client_id: client || null, project_id: project || null };
}

// ───────────────────────── Business Memory ─────────────────────────

const KINDS = ["note", "idea", "info", "goal"] as const;

export async function createKnowledge(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("memory.write");
    await assertMemoryCapacity(ctx.ent);
    const content = z.string().max(100_000).parse(fd(form, "content"));
    const title = z.string().trim().min(1, "Please give it a title.").max(200).parse(fd(form, "title") || content.split("\n")[0].slice(0, 80));
    const kind = KINDS.find((k) => k === fd(form, "kind")) ?? "info";
    const m = await ctx.db.insert("memories", {
      kind, title, content, summary: null, summary_source: null, tags: parseTags(fd(form, "tags")), category_id: null, document_id: null, pinned: false,
      ...(await links(ctx, form)),
    });
    await logActivity(ctx, "memory", m.id, "created", `“${title}” was added to the knowledge base`, m.project_id ?? null);
    revalidatePath(B, "layout");
    return { ok: true, message: "Saved to the knowledge base.", data: { id: m.id }, ts: Date.now() };
  });
}

export async function uploadBusinessDocument(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("memory.write");
    if (!(await isEnabled("document_uploads"))) throw new AuthError("Uploads are temporarily paused.");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AuthError("Please choose a file to upload.");
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.some((re) => re.test(mime))) throw new AuthError("This file type isn't supported yet. Try PDF, text, Markdown, images or audio.");
    await assertCanStore(ctx.ent, file.size);
    await assertMemoryCapacity(ctx.ent);
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
    // Business files live in the organization's folder.
    const storagePath = `org-${ctx.org.id}/${randomUUID()}-${safeName}`;
    await putFile(storagePath, buf, mime);
    const { text, status } = await extractText(buf, mime);
    const doc = await ctx.db.insert("documents", { file_name: safeName, mime_type: mime, size_bytes: file.size, storage_path: storagePath, extracted_text: text, extraction_status: status, extraction_method: text ? "parser" : null });
    const m = await ctx.db.insert("memories", {
      kind: kindForMime(mime), title: fd(form, "title") || safeName.replace(/\.[a-z0-9]+$/i, ""), content: fd(form, "note"),
      summary: null, summary_source: null, tags: parseTags(fd(form, "tags")), category_id: null, document_id: doc.id, pinned: false, ...(await links(ctx, form)),
    });
    await logActivity(ctx, "memory", m.id, "uploaded", `Document “${m.title}” was uploaded`, m.project_id ?? null);
    revalidatePath(B, "layout");
    return { ok: true, message: "Uploaded and saved to Memory.", data: { id: m.id }, ts: Date.now() };
  });
}

export async function updateKnowledge(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("memory.write");
    const m = await ctx.db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    if (!ctx.can("memory.delete_any") && m.user_id !== ctx.user.id) throw new AuthError("You can only edit entries you created.");
    const title = z.string().trim().min(1, "Please give it a title.").max(200).parse(fd(form, "title"));
    const content = z.string().max(100_000).parse(fd(form, "content"));
    await ctx.db.update("memories", m.id, { title, content, tags: parseTags(fd(form, "tags")), ...(await links(ctx, form)), ...(content !== m.content ? { summary: null, summary_source: null } : {}) });
    revalidatePath(`${B}/memory/${m.id}`);
    return { ok: true, message: "Changes saved.", ts: Date.now() };
  });
}

export async function deleteKnowledge(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const ctx = await assertOrg("memory.write");
    const m = await ctx.db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    if (!ctx.can("memory.delete_any") && m.user_id !== ctx.user.id) throw new AuthError("You can only delete entries you created.");
    if (m.document_id) {
      const doc = await ctx.db.get("documents", m.document_id);
      if (doc) { await deleteFiles([doc.storage_path]); await ctx.db.remove("documents", doc.id); }
    }
    await ctx.db.updateWhere("tasks", { source_memory_id: m.id }, { source_memory_id: null });
    await ctx.db.updateWhere("action_items", { memory_id: m.id }, { memory_id: null });
    await ctx.db.remove("memories", m.id);
    await logActivity(ctx, "memory", m.id, "deleted", `“${m.title}” was removed from the knowledge base`, m.project_id ?? null);
  });
  if (res.error) return res;
  revalidatePath(B, "layout");
  redirect(`${B}/memory`);
}

export async function summarizeKnowledge(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("memory.write");
    const m = await ctx.db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    let text = m.content;
    if (m.document_id) {
      await requireFeature(ctx.ent, "documentAnalysis");
      text += `\n\n${(await ctx.db.get("documents", m.document_id))?.extracted_text ?? ""}`;
    }
    const res = await summarize(aiCtx(ctx), m.title, text);
    await ctx.db.update("memories", m.id, { summary: res.summary, summary_source: res.source });
    revalidatePath(`${B}/memory/${m.id}`);
    return { ok: true, message: res.source === "ai" ? "Summary created." : "Quick summary created (extractive, no AI).", ts: Date.now() };
  });
}

export async function recognizeBusinessText(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("memory.write");
    const m = await ctx.db.get("memories", fd(form, "id"));
    const doc = m?.document_id ? await ctx.db.get("documents", m.document_id) : null;
    if (!m || !doc) throw new AuthError("Document not found.");
    if (!canAnalyzeFile(ctx.ent, doc.mime_type, doc.size_bytes, doc.extraction_method === "parser" && !!doc.extracted_text)) throw new AuthError("ONE can't read this file type with AI yet.");
    const data = await getFile(doc.storage_path);
    if (!data) throw new AuthError("The file could not be loaded.");
    const text = await recognizeFileText(aiCtx(ctx), data, doc.mime_type, doc.file_name);
    await ctx.db.update("documents", doc.id, { extracted_text: text, extraction_status: "done", extraction_method: "ai" });
    revalidatePath(`${B}/memory/${m.id}`);
    return { ok: true, message: "Text recognised — it's now searchable.", ts: Date.now() };
  });
}

export async function detectBusinessTasks(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("tasks.create");
    const m = await ctx.db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    const doc = m.document_id ? await ctx.db.get("documents", m.document_id) : null;
    const res = await extractTasks(aiCtx(ctx), `${m.title}\n${m.content}\n${doc?.extracted_text ?? ""}`);
    return { ok: true, message: res.tasks.length ? undefined : "No tasks or deadlines found.", data: { tasks: res.tasks, mode: res.mode }, ts: Date.now() };
  });
}

export async function addDetectedBusinessTasks(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("tasks.create");
    const memoryId = fd(form, "memory_id");
    const m = memoryId ? await ctx.db.get("memories", memoryId) : null;
    if (memoryId && !m) throw new AuthError("Memory not found.");
    const items = z.array(z.object({ title: z.string().min(1).max(200), due: z.string().nullable(), kind: z.enum(["task", "deadline", "appointment"]) })).max(20).parse(JSON.parse(fd(form, "tasks") || "[]"));
    for (const t of items) {
      await ctx.db.insert("tasks", {
        kind: t.kind, title: t.title, notes: null, due_at: t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? new Date(`${t.due}T09:00:00`).toISOString() : null,
        priority: t.kind === "deadline" ? "high" : "normal", status: "open", recurrence: "none", project_id: m?.project_id ?? null, category_id: null,
        source_memory_id: memoryId || null, completed_at: null, assignee_id: ctx.user.id, parent_id: null,
      });
    }
    await logActivity(ctx, "task", null, "created", `${items.length} tasks were created from “${m?.title ?? "a document"}”`, m?.project_id ?? null);
    revalidatePath(B, "layout");
    return { ok: true, message: `${items.length} ${items.length === 1 ? "item" : "items"} added to Life.`.replace("Life", "Tasks"), ts: Date.now() };
  });
}

// ───────────────────────── Business Action ─────────────────────────

const BTYPES = BUSINESS_ACTION_TYPES.map((a) => a.type) as [ActionType, ...ActionType[]];
const STATUSES: ActionStatus[] = ["new", "in_progress", "waiting", "waiting_external", "done"];

export async function createBusinessAction(_: ActionState, form: FormData): Promise<ActionState> {
  let id = "";
  const res = await run(async () => {
    const ctx = await assertOrg("actions.use");
    await assertActionCapacity(ctx.ent);
    const type = z.enum(BTYPES).parse(fd(form, "type") || "follow_up");
    const title = z.string().trim().min(1, "Please describe what you need.").max(200).parse(fd(form, "title"));
    const description = z.string().max(10_000).parse(fd(form, "description"));
    const memoryId = fd(form, "memory_id");
    const memory = memoryId ? await ctx.db.get("memories", memoryId) : null;
    if (memoryId && !memory) throw new AuthError("Linked memory not found.");
    const plan = await planAction(aiCtx(ctx), { type, title, description }, memory);
    const item = await ctx.db.insert("action_items", {
      type, title, description: description || null, status: plan.missing.length ? "waiting" : "new",
      steps: plan.steps.map((text) => ({ text, done: false })), draft: plan.draft, plan_source: plan.mode, missing_info: plan.missing,
      memory_id: memory?.id ?? null, external_confirmed_at: null,
    });
    await logActivity(ctx, "action", item.id, "created", `Action “${title}” was started`);
    id = item.id;
  });
  if (res.error) return res;
  revalidatePath(B, "layout");
  redirect(`${B}/action/${id}`);
}

export async function updateBusinessAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("actions.use");
    const a = await ctx.db.get("action_items", fd(form, "id"));
    if (!a) throw new AuthError("Action not found.");
    const op = fd(form, "op");
    if (op === "status") {
      const status = fd(form, "status") as ActionStatus;
      if (!STATUSES.includes(status)) throw new AuthError("Unknown status.");
      await ctx.db.update("action_items", a.id, { status });
      await logActivity(ctx, "action", a.id, "status", `Action “${a.title}” is now ${status.replace("_", " ")}`);
    } else if (op === "step") {
      const idx = Number(fd(form, "index"));
      if (!a.steps[idx]) throw new AuthError("Step not found.");
      await ctx.db.update("action_items", a.id, { steps: a.steps.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)), status: a.status === "new" ? "in_progress" : a.status });
    } else if (op === "draft") {
      await ctx.db.update("action_items", a.id, { draft: fd(form, "draft").slice(0, 20_000), missing_info: fd(form, "missing").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20) });
      return { ok: true, message: "Saved.", ts: Date.now() };
    } else if (op === "delete") {
      if (!ctx.can("tasks.manage") && a.user_id !== ctx.user.id) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
      await ctx.db.remove("action_items", a.id);
      revalidatePath(B, "layout");
      return { ok: true, data: { deleted: true }, ts: Date.now() };
    }
    revalidatePath(`${B}/action/${a.id}`);
    revalidatePath(`${B}/action`);
  });
}

// ───────────────────────── Ask ONE Business ─────────────────────────

export interface BizAskState extends ActionState {
  conversationId?: string;
  answer?: string;
  sources?: Source[];
  mode?: "ai" | "demo";
  question?: string;
}

export async function askBusiness(_: BizAskState, form: FormData): Promise<BizAskState> {
  let out: BizAskState = {};
  const res = await run(async () => {
    const ctx = await assertOrg("intelligence.view");
    if (!rateLimit(`ask:${ctx.user.id}`, 20, 60 * 1000)) throw new AuthError("You're asking very quickly — please wait a moment.");
    const question = z.string().trim().min(2, "Ask ONE something first.").max(4000).parse(fd(form, "question"));
    // Conversations are personal to the member who asks, inside the company scope.
    let conversationId = fd(form, "conversation_id");
    let history: { role: "user" | "assistant"; content: string }[] = [];
    if (conversationId) {
      const conv = await ctx.db.get("ai_conversations", conversationId);
      if (!conv || conv.user_id !== ctx.user.id) throw new AuthError("Conversation not found.");
      history = (await ctx.db.select("ai_messages", { where: { conversation_id: conversationId }, order: { column: "created_at" } })).map((m) => ({ role: m.role, content: m.content }));
    } else {
      conversationId = (await ctx.db.insert("ai_conversations", { title: question.slice(0, 60) })).id;
    }
    const result = await askOne(aiCtx(ctx), question, history);
    await ctx.db.insert("ai_messages", { conversation_id: conversationId, role: "user", content: question, sources: [], mode: result.mode });
    await ctx.db.insert("ai_messages", { conversation_id: conversationId, role: "assistant", content: result.answer, sources: result.sources, mode: result.mode });
    out = { ok: true, conversationId, answer: result.answer, sources: result.sources, mode: result.mode, question, ts: Date.now() };
  });
  if (res.error) return res;
  return out;
}

export async function quickCaptureBusiness(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const mode = fd(form, "mode");
    const ctx = await assertOrg(mode === "task" ? "tasks.create" : "memory.write");
    const text = z.string().trim().min(1, "Write something first.").max(20_000).parse(fd(form, "text"));
    if (mode === "task") {
      await ctx.db.insert("tasks", { kind: "task", title: text.slice(0, 200), notes: text.length > 200 ? text : null, due_at: null, priority: "normal", status: "open", recurrence: "none", project_id: null, category_id: null, source_memory_id: null, completed_at: null, assignee_id: ctx.user.id, parent_id: null });
      await logActivity(ctx, "task", null, "created", `Task “${text.slice(0, 60)}” was created`);
      revalidatePath(B, "layout");
      return { ok: true, message: "Task added.", ts: Date.now() };
    }
    await assertMemoryCapacity(ctx.ent);
    const first = text.split("\n")[0];
    const m = await ctx.db.insert("memories", { kind: "info", title: first.slice(0, 80), content: text, summary: null, summary_source: null, tags: [...text.matchAll(/#([\p{L}\d_-]{1,32})/gu)].map((x) => x[1].toLowerCase()).slice(0, 12), category_id: null, document_id: null, pinned: false, client_id: null, project_id: null });
    await logActivity(ctx, "memory", m.id, "created", `“${m.title}” was added to the knowledge base`);
    revalidatePath(B, "layout");
    return { ok: true, message: "Saved to the knowledge base.", data: { id: m.id }, ts: Date.now() };
  });
}

/** Form-action wrappers for one-click buttons / editors. */
export async function businessActionForm(form: FormData) {
  await updateBusinessAction({}, form);
}
export async function saveBusinessDraft(prev: ActionState, form: FormData): Promise<ActionState> {
  form.set("op", "draft");
  return updateBusinessAction(prev, form);
}
export async function deleteBusinessAction(prev: ActionState, form: FormData): Promise<ActionState> {
  form.set("op", "delete");
  const res = await updateBusinessAction(prev, form);
  if (res.error) return res;
  redirect(`${B}/action`);
}

export async function deleteBusinessConversation(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("intelligence.view");
    const conv = await ctx.db.get("ai_conversations", fd(form, "id"));
    if (!conv || conv.user_id !== ctx.user.id) throw new AuthError("Conversation not found.");
    await ctx.db.removeWhere("ai_messages", { conversation_id: conv.id });
    await ctx.db.remove("ai_conversations", conv.id);
    revalidatePath(`${B}/intelligence`);
  });
}
