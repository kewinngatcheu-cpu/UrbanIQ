"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import type { MemoryKind } from "@/lib/db/types";
import { assertCanStore, assertMemoryCapacity, requireFeature, personalEnt } from "@/lib/permissions/entitlements";
import { summarize, extractTasks, canAnalyzeFile, recognizeFileText, personalCtx } from "@/lib/ai/service";
import { isEnabled } from "@/lib/features";
import { putFile, deleteFiles, getFile } from "@/lib/storage";
import { extractText, kindForMime, ALLOWED_MIME } from "@/lib/documents";
import { fd, run } from "@/lib/safe-action";
import { parseTags } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";
import { AuthError } from "@/lib/auth";

const KINDS = ["note", "idea", "info", "goal"] as const;

const memorySchema = z.object({
  title: z.string().trim().min(1, "Please give it a title.").max(200),
  content: z.string().max(100_000),
  kind: z.enum(KINDS),
});

function deriveTitle(text: string) {
  const first = text.trim().split("\n")[0].replace(/^#+\s*/, "");
  return first.length > 80 ? first.slice(0, 77) + "…" : first || "Untitled note";
}

export async function createMemory(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    await assertMemoryCapacity(await personalEnt(user));
    const content = fd(form, "content");
    const parsed = memorySchema.parse({
      title: fd(form, "title") || deriveTitle(content),
      content,
      kind: KINDS.includes(fd(form, "kind") as never) ? fd(form, "kind") : "note",
    });
    const db = await userDb(user.id);
    const categoryId = fd(form, "category_id");
    if (categoryId && !(await db.get("categories", categoryId))) throw new AuthError("Unknown category.");
    const m = await db.insert("memories", {
      ...parsed,
      summary: null, summary_source: null,
      tags: parseTags(fd(form, "tags")),
      category_id: categoryId || null,
      document_id: null,
      pinned: false,
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Saved to your Memory.", data: { id: m.id }, ts: Date.now() };
  });
}

export async function updateMemory(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const id = fd(form, "id");
    const existing = await db.get("memories", id);
    if (!existing) throw new AuthError("Memory not found.");
    const parsed = memorySchema.parse({
      title: fd(form, "title"),
      content: fd(form, "content"),
      kind: KINDS.includes(fd(form, "kind") as never) ? fd(form, "kind") : (KINDS.includes(existing.kind as never) ? existing.kind : "note"),
    });
    const categoryId = fd(form, "category_id");
    if (categoryId && !(await db.get("categories", categoryId))) throw new AuthError("Unknown category.");
    await db.update("memories", id, {
      title: parsed.title,
      content: parsed.content,
      kind: existing.kind === "document" || existing.kind === "image" || existing.kind === "voice" ? existing.kind : parsed.kind,
      tags: parseTags(fd(form, "tags")),
      category_id: categoryId || null,
      ...(parsed.content !== existing.content ? { summary: null, summary_source: null } : {}),
    });
    revalidatePath(`/app/memory/${id}`);
    return { ok: true, message: "Changes saved.", ts: Date.now() };
  });
}

export async function togglePin(form: FormData) {
  const user = await assertUser();
  const db = await userDb(user.id);
  const m = await db.get("memories", fd(form, "id"));
  if (!m) return;
  await db.update("memories", m.id, { pinned: !m.pinned });
  revalidatePath("/app", "layout");
}

export async function deleteMemory(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const m = await db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    if (m.document_id) {
      const doc = await db.get("documents", m.document_id);
      if (doc) {
        await deleteFiles([doc.storage_path]);
        await db.remove("documents", doc.id);
      }
    }
    await db.updateWhere("tasks", { source_memory_id: m.id }, { source_memory_id: null });
    await db.updateWhere("action_items", { memory_id: m.id }, { memory_id: null });
    await db.remove("memories", m.id);
  });
  if (res.error) return res;
  revalidatePath("/app", "layout");
  redirect("/app/memory");
}

export async function uploadDocument(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    if (!(await isEnabled("document_uploads"))) throw new AuthError("Uploads are temporarily paused.");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AuthError("Please choose a file to upload.");
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.some((re) => re.test(mime))) throw new AuthError("This file type isn't supported yet. Try PDF, text, Markdown, images or audio.");
    const kind: MemoryKind = kindForMime(mime);
    if (kind === "voice" && !(await isEnabled("voice_notes_preview"))) throw new AuthError("Voice notes are coming soon.");
    await assertCanStore(await personalEnt(user), file.size);
    await assertMemoryCapacity(await personalEnt(user));
    const db = await userDb(user.id);
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
    const storagePath = `${user.id}/${randomUUID()}-${safeName}`;
    await putFile(storagePath, buf, mime);
    const { text, status } = await extractText(buf, mime);
    const doc = await db.insert("documents", {
      file_name: safeName, mime_type: mime, size_bytes: file.size, storage_path: storagePath,
      extracted_text: text, extraction_status: status, extraction_method: text ? "parser" : null,
    });
    const note = fd(form, "note");
    const m = await db.insert("memories", {
      kind,
      title: fd(form, "title") || safeName.replace(/\.[a-z0-9]+$/i, ""),
      content: note,
      summary: null, summary_source: null,
      tags: parseTags(fd(form, "tags")),
      category_id: null,
      document_id: doc.id,
      pinned: false,
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Uploaded and saved to Memory.", data: { id: m.id }, ts: Date.now() };
  });
}

export async function summarizeMemory(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const m = await db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    let text = m.content;
    if (m.document_id) {
      await requireFeature(await personalEnt(user), "documentAnalysis");
      const doc = await db.get("documents", m.document_id);
      text = `${m.content}\n\n${doc?.extracted_text ?? ""}`;
    }
    const res = await summarize(await personalCtx(user), m.title, text);
    await db.update("memories", m.id, { summary: res.summary, summary_source: res.source });
    revalidatePath(`/app/memory/${m.id}`);
    return { ok: true, message: res.source === "ai" ? "Summary created." : "Quick summary created (extractive, no AI).", ts: Date.now() };
  });
}

export async function detectTasks(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const m = await db.get("memories", fd(form, "id"));
    if (!m) throw new AuthError("Memory not found.");
    const doc = m.document_id ? await db.get("documents", m.document_id) : null;
    const res = await extractTasks(await personalCtx(user), `${m.title}\n${m.content}\n${doc?.extracted_text ?? ""}`);
    return {
      ok: true,
      message: res.tasks.length ? undefined : "No tasks or deadlines found.",
      data: { tasks: res.tasks, mode: res.mode },
      ts: Date.now(),
    };
  });
}

export async function addDetectedTasks(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const memoryId = fd(form, "memory_id");
    if (memoryId && !(await db.get("memories", memoryId))) throw new AuthError("Memory not found.");
    const items = z.array(z.object({ title: z.string().min(1).max(200), due: z.string().nullable(), kind: z.enum(["task", "deadline", "appointment"]) }))
      .max(20).parse(JSON.parse(fd(form, "tasks") || "[]"));
    for (const t of items) {
      await db.insert("tasks", {
        kind: t.kind, title: t.title, notes: null,
        due_at: t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? new Date(`${t.due}T09:00:00`).toISOString() : null,
        priority: t.kind === "deadline" ? "high" : "normal", status: "open", recurrence: "none",
        project_id: null, category_id: null, source_memory_id: memoryId || null, completed_at: null,
      });
    }
    revalidatePath("/app", "layout");
    return { ok: true, message: `${items.length} ${items.length === 1 ? "item" : "items"} added to Life.`, ts: Date.now() };
  });
}

/** OCR for images / scanned PDFs via the AI (explicit user action, uses one AI request). */
export async function recognizeText(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    await requireFeature(await personalEnt(user), "documentAnalysis");
    const db = await userDb(user.id);
    const m = await db.get("memories", fd(form, "id"));
    const doc = m?.document_id ? await db.get("documents", m.document_id) : null;
    if (!m || !doc) throw new AuthError("Document not found.");
    if (!canAnalyzeFile(await personalEnt(user), doc.mime_type, doc.size_bytes, doc.extraction_method === "parser" && !!doc.extracted_text)) {
      throw new AuthError("ONE can't read this file type with AI yet.");
    }
    const data = await getFile(doc.storage_path);
    if (!data) throw new AuthError("The file could not be loaded.");
    const text = await recognizeFileText(await personalCtx(user), data, doc.mime_type, doc.file_name);
    await db.update("documents", doc.id, { extracted_text: text, extraction_status: "done", extraction_method: "ai" });
    await db.update("memories", m.id, { summary: null, summary_source: null });
    revalidatePath(`/app/memory/${m.id}`);
    return { ok: true, message: "Text recognised — it's now searchable.", ts: Date.now() };
  });
}
