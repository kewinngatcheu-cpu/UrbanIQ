import "server-only";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createMemory, retrieveContext } from "@/lib/memory/service";
import { createTask, listTasks } from "@/lib/tasks";
import { getWorkspace } from "@/lib/workspaces";
import { getSettings } from "@/lib/settings";
import { buildSystemPrompt } from "./systemPrompt";
import { resolveEnabledProvider } from "./registry";
import { parseCommand, HELP_TEXT } from "./commands";
import { extractMemories } from "./memoryExtraction";
import type { ChatTurn, LLMProvider } from "./types";

export type ChatEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "context"; memories: { id: string; title: string; layer: string; status: string }[]; provider: string | null; model: string | null }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; model: string | null; provider: string | null; stopReason: string }
  | { type: "action"; action: string; status: "succeeded" | "failed"; target?: string; detail?: string }
  | { type: "memory_proposals"; memories: { id: string; title: string; status: string }[] }
  | { type: "error"; code: string; message: string };

const HISTORY_WINDOW = 20;   // recent messages sent verbatim
const SUMMARIZE_AFTER = 30;  // summarize older messages once more than this many are unsummarized

export async function handleChat(
  input: { conversationId?: string | null; workspaceId: string; message: string; signal?: AbortSignal },
  emit: (e: ChatEvent) => void,
) {
  const db = await getDb();
  const workspace = await getWorkspace(input.workspaceId);
  if (!workspace) return emit({ type: "error", code: "workspace", message: "Unbekannter Workspace." });

  // 1. Conversation
  let conv = input.conversationId
    ? (await db.query<{ id: string; title: string; workspace_id: string; summary: string | null }>(`SELECT id, title, workspace_id, summary FROM conversations WHERE id = $1`, [input.conversationId]))[0]
    : undefined;
  if (conv && conv.workspace_id !== workspace.id) return emit({ type: "error", code: "workspace_mismatch", message: "Diese Unterhaltung gehört zu einem anderen Workspace." });
  if (!conv) {
    const title = input.message.replace(/\s+/g, " ").slice(0, 60) + (input.message.length > 60 ? "…" : "");
    conv = (await db.query<{ id: string; title: string; workspace_id: string; summary: string | null }>(
      `INSERT INTO conversations (workspace_id, title) VALUES ($1,$2) RETURNING id, title, workspace_id, summary`, [workspace.id, title]))[0];
  }
  emit({ type: "conversation", id: conv.id, title: conv.title });

  const [userMsg] = await db.query<{ id: string }>(`INSERT INTO messages (conversation_id, role, content) VALUES ($1,'user',$2) RETURNING id`, [conv.id, input.message]);
  await db.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [conv.id]);

  // 2. Deterministic commands (no AI needed, results are real)
  const cmd = parseCommand(input.message);
  if (cmd) {
    let reply: string;
    if (cmd.kind === "help") reply = HELP_TEXT;
    else if (cmd.kind === "remember") {
      const r = await createMemory({
        workspaceId: workspace.id,
        layer: workspace.kind === "business" ? "business" : "personal",
        category: "notiz",
        title: shortTitle(cmd.text),
        content: cmd.text,
        source: "user",
        sourceRef: userMsg.id,
        importance: 3,
      }, "owner");
      if (r.kind === "duplicate") {
        reply = `Nicht gespeichert – sehr ähnlicher Eintrag existiert bereits: **${r.existing.title}**. Bearbeite ihn im Memory Center, falls sich etwas geändert hat.`;
        emit({ type: "action", action: "memory.create", status: "failed", detail: "duplicate" });
      } else {
        reply = `Gespeichert im Workspace **${workspace.name}**: „${r.memory.title}“.` +
          (r.related.length ? `\n\nVerwandte Einträge (prüfen auf Widersprüche): ${r.related.map((m) => `„${m.title}“`).join(", ")}` : "");
        emit({ type: "action", action: "memory.create", status: "succeeded", target: r.memory.id });
      }
    } else {
      const t = await createTask({ workspaceId: workspace.id, title: cmd.title, priority: cmd.priority, dueAt: cmd.dueAt }, "owner");
      reply = `Aufgabe angelegt in **${workspace.name}**: „${t.title}“ · Priorität ${PRIO_DE[t.priority]}` +
        (t.due_at ? ` · fällig ${new Date(t.due_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" })}` : "");
      emit({ type: "action", action: "task.create", status: "succeeded", target: t.id });
    }
    const [m] = await db.query<{ id: string }>(
      `INSERT INTO messages (conversation_id, role, content, provider, metadata) VALUES ($1,'assistant',$2,'command',$3) RETURNING id`,
      [conv.id, reply, JSON.stringify({ command: cmd.kind })]);
    emit({ type: "delta", text: reply });
    return emit({ type: "done", messageId: m.id, model: null, provider: "command", stopReason: "end_turn" });
  }

  // 3. AI path
  const settings = await getSettings();
  const provider = await resolveEnabledProvider(settings.aiProvider);
  const model = provider ? (provider.id === "anthropic" ? settings.anthropicModel : settings.openaiModel) : null;
  const memories = await retrieveContext(workspace.id, input.message, 10);
  emit({ type: "context", memories: memories.map((m) => ({ id: m.id, title: m.title, layer: m.layer, status: m.status })), provider: provider?.id ?? null, model });

  if (!provider) {
    await audit({ actor: "jarvis", action: "chat.respond", workspaceId: workspace.id, status: "failed", details: { reason: "no_provider" } });
    return emit({
      type: "error",
      code: "no_provider",
      message: "Kein KI-Anbieter konfiguriert. Setze ANTHROPIC_API_KEY (oder OPENAI_API_KEY) in .env.local und starte JARVIS neu. Befehle wie /merke und /aufgabe funktionieren trotzdem.",
    });
  }

  const tasks = await listTasks({ workspaceId: workspace.id, status: "open" });
  const history = await db.query<{ role: "user" | "assistant"; content: string }>(
    `SELECT role, content FROM (SELECT role, content, created_at FROM messages WHERE conversation_id = $1 AND role IN ('user','assistant')
       ORDER BY created_at DESC LIMIT $2) t ORDER BY created_at`, [conv.id, HISTORY_WINDOW]);
  const messages = normalizeTurns(history);
  const system = buildSystemPrompt({ workspace, memories, tasks, conversationSummary: conv.summary });

  try {
    const result = await provider.stream({ system, messages, model: model ?? undefined, effort: settings.effort, signal: input.signal }, (text) => emit({ type: "delta", text }));
    let text = result.text;
    if (result.stopReason === "refusal" && !text.trim()) {
      text = "Diese Anfrage wurde vom Modell abgelehnt (Sicherheitsfilter). Formuliere sie bitte anders.";
      emit({ type: "delta", text });
    }
    const [m] = await db.query<{ id: string }>(
      `INSERT INTO messages (conversation_id, role, content, provider, model, input_tokens, output_tokens, metadata)
       VALUES ($1,'assistant',$2,$3,$4,$5,$6,$7) RETURNING id`,
      [conv.id, text, result.provider, result.model, result.inputTokens ?? null, result.outputTokens ?? null,
        JSON.stringify({ memoryIds: memories.map((x) => x.id), stopReason: result.stopReason })]);
    await audit({ actor: "jarvis", action: "chat.respond", target: conv.id, workspaceId: workspace.id, level: 1,
      details: { provider: result.provider, model: result.model, stopReason: result.stopReason, in: result.inputTokens, out: result.outputTokens } });
    emit({ type: "done", messageId: m.id, model: result.model, provider: result.provider, stopReason: result.stopReason });

    // 4. Post-processing: memory proposals + rolling summary. Failures are logged, not hidden.
    if (settings.memoryMode !== "off" && result.stopReason !== "refusal") {
      try {
        const created = await extractMemories({ provider, workspaceId: workspace.id, userMessage: input.message, assistantMessage: text,
          messageId: userMsg.id, mode: settings.memoryMode, known: memories });
        if (created.length) emit({ type: "memory_proposals", memories: created.map((x) => ({ id: x.id, title: x.title, status: x.status })) });
      } catch (e) {
        await audit({ actor: "jarvis", action: "memory.extract", workspaceId: workspace.id, status: "failed", details: { error: String(e) } });
      }
    }
    await maybeSummarize(conv.id, provider, model).catch((e) =>
      audit({ actor: "jarvis", action: "conversation.summarize", target: conv!.id, status: "failed", details: { error: String(e) } }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await audit({ actor: "jarvis", action: "chat.respond", target: conv.id, workspaceId: workspace.id, status: "failed", details: { error: message } });
    emit({ type: "error", code: "provider_error", message: `KI-Anbieter-Fehler (${provider.label}): ${message}` });
  }
}

/** The API needs alternating turns that start with "user"; merge consecutive same-role messages. */
export function normalizeTurns(rows: { role: "user" | "assistant"; content: string }[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const r of rows) {
    if (!r.content.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === r.role) last.content += "\n\n" + r.content;
    else out.push({ role: r.role, content: r.content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

async function maybeSummarize(conversationId: string, provider: LLMProvider, model: string | null) {
  const db = await getDb();
  const [conv] = await db.query<{ summary: string | null; summarized_until: string | null }>(
    `SELECT summary, summarized_until FROM conversations WHERE id = $1`, [conversationId]);
  const older = await db.query<{ role: string; content: string; created_at: string }>(
    `SELECT role, content, created_at FROM messages WHERE conversation_id = $1 AND role IN ('user','assistant')
       AND ($2::timestamptz IS NULL OR created_at > $2) ORDER BY created_at`, [conversationId, conv.summarized_until]);
  if (older.length <= SUMMARIZE_AFTER) return;
  const toSummarize = older.slice(0, older.length - HISTORY_WINDOW);
  const transcript = toSummarize.map((m) => `${m.role === "user" ? "Kewin" : "JARVIS"}: ${m.content.slice(0, 2000)}`).join("\n");
  let summary = "";
  await provider.stream({
    system: "Fasse den Gesprächsverlauf sachlich auf Deutsch zusammen: Entscheidungen, Fakten, offene Fragen, vereinbarte nächste Schritte. Max. 250 Wörter.",
    messages: [{ role: "user", content: `${conv.summary ? `Bisherige Zusammenfassung:\n${conv.summary}\n\n` : ""}Neuer Verlauf:\n${transcript}` }],
    model: model ?? undefined, effort: "low", maxTokens: 2000,
  }, (t) => { summary += t; });
  if (summary.trim()) {
    await db.query(`UPDATE conversations SET summary = $2, summarized_until = $3 WHERE id = $1`,
      [conversationId, summary.trim(), toSummarize[toSummarize.length - 1].created_at]);
  }
}

const PRIO_DE: Record<string, string> = { critical: "kritisch", high: "hoch", medium: "mittel", low: "niedrig" };

/** First sentence (or first 70 chars cut at a word boundary) as a memory title. */
export function shortTitle(text: string, max = 70): string {
  const first = text.split(/(?<=[.!?])\s|\n/)[0].replace(/[.!?:]+$/, "").trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).trim() + "…";
}
