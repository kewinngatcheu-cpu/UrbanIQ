import "server-only";
import { getLocale, getT } from "@/lib/i18n/server";
import { userDb, type UserDb } from "@/lib/db";
import type { ActionItem, Memory, Profile, Source } from "@/lib/db/types";
import { consumeAiRequest, hasFeature, planOf, requireFeature, LimitError } from "@/lib/permissions/entitlements";
import { isEnabled } from "@/lib/features";
import { aiAvailable, complete, completeJson, AiError } from "./provider";
import { extractiveSummary, heuristicTasks, search, type Doc, type ExtractedTask } from "./retrieval";
import { TEMPLATES, actionLabel } from "./templates";

export type AiResultMode = "ai" | "demo";

async function guard() {
  if (!(await isEnabled("ai_assistant"))) throw new AiError("ONE's AI features are temporarily paused by the operator.");
}

/** Builds the user's retrieval corpus — strictly from their own scoped data. */
export async function buildCorpus(db: UserDb): Promise<Doc[]> {
  const [memories, docs, tasks, actions] = await Promise.all([
    db.select("memories", { order: { column: "created_at", ascending: false }, limit: 2000 }),
    db.select("documents", { limit: 2000 }),
    db.select("tasks", { limit: 2000 }),
    db.select("action_items", { limit: 1000 }),
  ]);
  const docText = new Map(docs.map((d) => [d.id, d.extracted_text ?? ""]));
  return [
    ...memories.map<Doc>((m) => ({
      type: "memory", id: m.id, title: m.title, tags: m.tags, date: m.created_at,
      text: [m.content, m.summary ?? "", m.document_id ? (docText.get(m.document_id) ?? "").slice(0, 20000) : ""].join("\n"),
    })),
    ...tasks.map<Doc>((t) => ({
      type: "task", id: t.id, title: t.title, date: t.due_at ?? t.created_at,
      text: `${t.kind}${t.due_at ? ` due ${t.due_at.slice(0, 10)}` : ""} status ${t.status}. ${t.notes ?? ""}`,
    })),
    ...actions.map<Doc>((a) => ({
      type: "action", id: a.id, title: a.title, date: a.created_at,
      text: `${actionLabel(a.type)} (${a.status}). ${a.description ?? ""} ${a.steps.map((s) => s.text).join(". ")}`,
    })),
  ];
}

const GROUNDING_RULES = `You are ONE, a calm, friendly personal assistant inside the user's "Personal Life Operating System".
Rules you must always follow:
- Answer questions about the user's life ONLY from the numbered CONTEXT items. Never invent memories, facts, dates, numbers or documents.
- Cite every item you rely on with its marker, e.g. [2]. Only cite items you actually used.
- If the context does not contain the answer, say plainly that you have no stored information about it, and suggest what the user could save.
- If information is missing, ambiguous or contradictory, say so explicitly.
- General knowledge questions (not about the user's own life) may be answered from general knowledge, clearly marked as general information, without citations.
- Never claim you sent, booked, paid, cancelled or changed anything. You can only prepare drafts; the user must confirm and act.
- Be concise and warm. Use short paragraphs or bullet points. Answer in the language of the user's question.`;

function contextBlock(items: Doc[]) {
  if (!items.length) return "CONTEXT: (no matching stored items)";
  return "CONTEXT:\n" + items.map((d, i) => `[${i + 1}] (${d.type}) ${d.title}${d.date ? ` — ${d.date.slice(0, 10)}` : ""}\n${d.text.slice(0, 3000)}`).join("\n\n");
}

export interface AskResult {
  answer: string;
  sources: Source[];
  mode: AiResultMode;
}

export async function askOne(user: Profile, question: string, history: { role: "user" | "assistant"; content: string }[] = []): Promise<AskResult> {
  await guard();
  const db = await userDb(user.id);
  const corpus = await buildCorpus(db);
  const toSource = (d: Doc): Source => ({ type: d.type, id: d.id, title: d.title });

  const tr = await getT();
  if (!aiAvailable()) {
    // Without a model, be strict: only show items that match most of the question.
    const hits = search(corpus, question, 8, 0.5).map((h) => h.doc);
    if (!hits.length) {
      return {
        mode: "demo",
        sources: [],
        answer: tr("**Demo mode — no AI model is connected.** I searched your stored information but found nothing matching your question. ONE never makes up memories: save a note or upload a document about it, and I'll find it next time."),
      };
    }
    return {
      mode: "demo",
      sources: hits.slice(0, 5).map(toSource),
      answer: `${tr("**Demo mode — no AI model is connected**, so I can't write a real answer yet. Here is what I found in your own stored information (keyword search):")}\n\n${hits
        .slice(0, 5)
        .map((d, i) => `${i + 1}. **${d.title}** (${tr(d.type)}) — ${d.text.replace(/\s+/g, " ").slice(0, 160)}${d.text.length > 160 ? "…" : ""}`)
        .join("\n")}`,
    };
  }

  // With a model, retrieve generously — the model is instructed to use only relevant items and cite them.
  const hits = search(corpus, question, 8).map((h) => h.doc);
  requireFeature(user, "contextSearch");
  await consumeAiRequest(user);
  const today = new Date().toISOString().slice(0, 10);
  const answer = await complete({
    system: `${GROUNDING_RULES}\nToday is ${today}. The user's name is ${user.full_name ?? "unknown"}.`,
    effort: planOf(user).aiEffort,
    maxTokens: 6000,
    messages: [
      ...history.slice(-8),
      { role: "user", content: `${contextBlock(hits)}\n\nQUESTION: ${question}` },
    ],
  });
  const cited = new Set([...(answer ?? "").matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1]) - 1));
  const sources = hits.filter((_, i) => cited.has(i)).map(toSource);
  // Re-number citations to match the displayed source list.
  const order = hits.map((_, i) => i).filter((i) => cited.has(i));
  const renumbered = (answer ?? "").replace(/\[(\d{1,2})\]/g, (m, n) => {
    const pos = order.indexOf(Number(n) - 1);
    return pos >= 0 ? `[${pos + 1}]` : "";
  });
  return { answer: renumbered, sources, mode: "ai" };
}

export interface SummaryResult {
  summary: string;
  source: "ai" | "extractive";
}

export async function summarize(user: Profile, title: string, text: string): Promise<SummaryResult> {
  const clean = text.trim();
  if (clean.length < 40) throw new AiError("There isn't enough text to summarise yet.");
  if (!aiAvailable() || !hasFeature(user, "advancedSummaries")) {
    return { summary: extractiveSummary(clean, 3), source: "extractive" };
  }
  await guard();
  await consumeAiRequest(user);
  const summary = await complete({
    system: "You summarise the user's own documents and notes. Use only the provided text. Never add facts. Output 3-6 concise bullet points: what it is, key facts (amounts, dates, parties), and what the user may need to do. Mention missing or unclear information. Answer in the language of the text.",
    effort: "low",
    maxTokens: 2000,
    messages: [{ role: "user", content: `TITLE: ${title}\n\nTEXT:\n${clean.slice(0, 60000)}` }],
  });
  return { summary: summary!, source: "ai" };
}

export interface ExtractResult {
  tasks: ExtractedTask[];
  mode: AiResultMode;
}

const TASKS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tasks"],
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "due", "kind"],
        properties: {
          title: { type: "string" },
          due: { type: ["string", "null"], description: "ISO date yyyy-mm-dd if explicitly stated, else null" },
          kind: { type: "string", enum: ["task", "deadline", "appointment"] },
        },
      },
    },
  },
};

export async function extractTasks(user: Profile, text: string): Promise<ExtractResult> {
  requireFeature(user, "taskExtraction");
  if (!aiAvailable()) return { tasks: heuristicTasks(text), mode: "demo" };
  await guard();
  await consumeAiRequest(user);
  const res = await completeJson<{ tasks: ExtractedTask[] }>({
    system: `Extract concrete action items, deadlines and appointments for the user from their text. Only include items explicitly present or clearly implied. Never invent dates: use null if no date is stated. Today is ${new Date().toISOString().slice(0, 10)}. Keep titles short and imperative, in the language of the text. Maximum 12 items.`,
    effort: "low",
    maxTokens: 3000,
    schema: TASKS_SCHEMA,
    messages: [{ role: "user", content: text.slice(0, 60000) }],
  });
  const tasks = (res?.tasks ?? []).filter((t) => t.title?.trim()).slice(0, 12).map((t) => ({
    ...t,
    due: t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : null,
  }));
  return { tasks, mode: "ai" };
}

export interface PlanResult {
  steps: string[];
  draft: string | null;
  missing: string[];
  mode: "ai" | "template";
}

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["steps", "draft", "missing_info"],
  properties: {
    steps: { type: "array", items: { type: "string" } },
    draft: { type: ["string", "null"], description: "Ready-to-review letter/email draft if useful, else null" },
    missing_info: { type: "array", items: { type: "string" } },
  },
};

export async function planAction(user: Profile, action: Pick<ActionItem, "type" | "title" | "description">, context: Memory | null): Promise<PlanResult> {
  const t = TEMPLATES[action.type];
  const details = `${action.description ?? ""}\n${context ? `${context.title}\n${context.content}` : ""}`.trim();
  if (!aiAvailable()) {
    const de = (await getLocale()) === "de" && t.draftDe;
    return { steps: t.steps, draft: (de ? t.draftDe! : t.draft)(action.title, action.description ?? ""), missing: t.missing(details), mode: "template" };
  }
  requireFeature(user, "actionPlans");
  await guard();
  await consumeAiRequest(user);
  const res = await completeJson<{ steps: string[]; draft: string | null; missing_info: string[] }>({
    system: `You help the user get a personal task done ("${actionLabel(action.type)}"). Create 3-7 concrete, ordered next steps, a ready-to-review draft (letter or email) when it helps, and a list of missing information the user must supply. Use placeholders like [NAME] instead of inventing personal data. Never claim anything was sent — the user sends it themselves after reviewing. Write in the language of the user's description. Today is ${new Date().toISOString().slice(0, 10)}.`,
    effort: planOf(user).aiEffort,
    maxTokens: 6000,
    schema: PLAN_SCHEMA,
    messages: [{ role: "user", content: `TITLE: ${action.title}\nDETAILS: ${action.description ?? "(none)"}${context ? `\n\nLINKED MEMORY: ${context.title}\n${context.content.slice(0, 20000)}` : ""}` }],
  });
  return { steps: (res?.steps ?? t.steps).slice(0, 10), draft: res?.draft ?? null, missing: res?.missing_info ?? [], mode: "ai" };
}

// ───────────────────────── File analysis (OCR / scanned PDFs) ─────────────────────────

const VISION_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_VISION_BYTES = 5 * 1024 * 1024; // API limit for images

/** Can ONE's AI read this file for this user right now? (no quota is used by asking) */
export function canAnalyzeFile(user: Profile, mime: string, size: number, hasText: boolean) {
  if (!aiAvailable() || !hasFeature(user, "documentAnalysis")) return false;
  if (VISION_MIME.has(mime)) return size <= MAX_VISION_BYTES;
  return mime === "application/pdf" && !hasText; // scanned PDF without a text layer
}

/**
 * Recognises the text in an image or scanned PDF and adds a short factual description.
 * Uses one AI request. The model is told to transcribe only what is visible.
 */
export async function recognizeFileText(user: Profile, data: Buffer, mime: string, fileName: string): Promise<string> {
  await guard();
  requireFeature(user, "documentAnalysis");
  await consumeAiRequest(user);
  const b64 = data.toString("base64");
  const file = mime === "application/pdf"
    ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } } as const)
    : ({ type: "image", source: { type: "base64", media_type: mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: b64 } } as const);
  const text = await complete({
    system: "You turn the user's own uploaded files into searchable text. Transcribe all readable text exactly as written (keep numbers, dates, names, amounts). Do not guess unreadable parts — mark them as [unreadable]. After the transcription write a line with three dashes and then one or two sentences describing what the file is. If there is no text, only write the description. Never add information that is not visible.",
    effort: "low",
    maxTokens: 12000,
    messages: [{ role: "user", content: [file, { type: "text", text: `File name: ${fileName}` }] }],
  });
  return (text ?? "").slice(0, 200_000);
}

export { AiError, LimitError };
