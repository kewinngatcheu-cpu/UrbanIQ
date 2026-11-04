"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser, AuthError } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { askOne, personalCtx } from "@/lib/ai/service";
import { rateLimit } from "@/lib/auth/rate-limit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import type { Source } from "@/lib/db/types";

export interface AskState extends ActionState {
  conversationId?: string;
  answer?: string;
  sources?: Source[];
  mode?: "ai" | "demo";
  question?: string;
}

export async function ask(_: AskState, form: FormData): Promise<AskState> {
  let out: AskState = {};
  const res = await run(async () => {
    const user = await assertUser();
    if (!rateLimit(`ask:${user.id}`, 20, 60 * 1000)) throw new AuthError("You're asking very quickly — please wait a moment.");
    const question = z.string().trim().min(2, "Ask ONE something first.").max(4000).parse(fd(form, "question"));
    const db = await userDb(user.id);
    let conversationId = fd(form, "conversation_id");
    let history: { role: "user" | "assistant"; content: string }[] = [];
    let convTitle = "";
    if (conversationId) {
      const conv = await db.get("ai_conversations", conversationId);
      if (!conv) throw new AuthError("Conversation not found.");
      convTitle = conv.title;
      history = (await db.select("ai_messages", { where: { conversation_id: conversationId }, order: { column: "created_at" } }))
        .map((m) => ({ role: m.role, content: m.content }));
    } else {
      const conv = await db.insert("ai_conversations", { title: question.length > 60 ? question.slice(0, 57) + "…" : question });
      conversationId = conv.id;
      convTitle = conv.title;
    }
    const result = await askOne(await personalCtx(user), question, history);
    await db.insert("ai_messages", { conversation_id: conversationId, role: "user", content: question, sources: [], mode: result.mode });
    await db.insert("ai_messages", { conversation_id: conversationId, role: "assistant", content: result.answer, sources: result.sources, mode: result.mode });
    await db.update("ai_conversations", conversationId, { title: convTitle }); // bumps updated_at
    out = { ok: true, conversationId, answer: result.answer, sources: result.sources, mode: result.mode, question, ts: Date.now() };
  });
  if (res.error) return res;
  revalidatePath("/app/intelligence");
  return out;
}

export async function deleteConversation(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const id = fd(form, "id");
    await db.removeWhere("ai_messages", { conversation_id: id });
    await db.remove("ai_conversations", id);
    revalidatePath("/app/intelligence");
  });
}

/** Quick capture from the dashboard: save a thought as memory, or a task. */
export async function quickCapture(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    const text = z.string().trim().min(1, "Write something first.").max(20_000).parse(fd(form, "text"));
    const mode = fd(form, "mode");
    if (mode === "task") {
      await db.insert("tasks", {
        kind: "task", title: text.slice(0, 200), notes: text.length > 200 ? text : null, due_at: null, priority: "normal", status: "open",
        recurrence: "none", project_id: null, category_id: null, source_memory_id: null, completed_at: null,
      });
      revalidatePath("/app", "layout");
      return { ok: true, message: "Task added to Life.", ts: Date.now() };
    }
    const { assertMemoryCapacity, personalEnt } = await import("@/lib/permissions/entitlements");
    await assertMemoryCapacity(await personalEnt(user));
    const first = text.split("\n")[0];
    const m = await db.insert("memories", {
      kind: "note", title: first.length > 80 ? first.slice(0, 77) + "…" : first, content: text,
      summary: null, summary_source: null, tags: [...text.matchAll(/#([\p{L}\d_-]{1,32})/gu)].map((x) => x[1].toLowerCase()).slice(0, 12),
      category_id: null, document_id: null, pinned: false,
    });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Saved to Memory.", data: { id: m.id }, ts: Date.now() };
  });
}
