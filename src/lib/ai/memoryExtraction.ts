import "server-only";
import { z } from "zod";
import { createMemory, LAYERS, type Memory } from "@/lib/memory/service";
import type { LLMProvider } from "./types";

const proposalSchema = z.object({
  memories: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      layer: z.enum(LAYERS),
      category: z.string(),
      importance: z.number().int(),
      confidence: z.number(),
      corrects_existing_title: z.string().nullable(),
    }),
  ),
});

const SYSTEM = `Du extrahierst langfristig nützliche Fakten über Kewin aus einem Gesprächsausschnitt für sein persönliches Gedächtnissystem.
Nur speichern, was Kewin SELBST explizit gesagt hat und auch in Wochen noch relevant ist: Ziele, Entscheidungen, Präferenzen,
Projektstatus, Fakten über sein Leben/seine Unternehmen, gelernte Lektionen, Termine/Verpflichtungen.
NICHT speichern: Smalltalk, temporäre Details, Fragen ohne neue Fakten, Aussagen von JARVIS, Vermutungen.
Wenn nichts Speicherwürdiges vorkommt, gib eine leere Liste zurück. Maximal 3 Einträge.
layer: identity|personal|business|project|conversational|strategic|operational. importance 1-5. confidence 0-1.
Wenn eine Aussage einen bekannten Eintrag korrigiert, setze corrects_existing_title auf dessen Titel, sonst null.
Titel kurz (max. 8 Wörter), Inhalt als eigenständiger Satz auf Deutsch.`;

/**
 * Proposes memories from the latest exchange. In "suggest" mode they are stored with status=proposed
 * and only become part of JARVIS's context after Kewin approves them in the Memory Center.
 * Corrections never overwrite: the new entry is marked "uncertain" and linked for manual resolution.
 */
export async function extractMemories(args: {
  provider: LLMProvider;
  workspaceId: string;
  userMessage: string;
  assistantMessage: string;
  messageId: string;
  mode: "suggest" | "auto";
  known: Memory[];
}): Promise<Memory[]> {
  const known = args.known.map((m) => `- ${m.title}: ${m.content}`).join("\n") || "(keine)";
  const result = await args.provider.json({
    system: SYSTEM,
    schema: proposalSchema,
    prompt: `<bekannte_eintraege>\n${known}\n</bekannte_eintraege>\n\n<kewin>\n${args.userMessage.slice(0, 6000)}\n</kewin>\n\n<jarvis>\n${args.assistantMessage.slice(0, 3000)}\n</jarvis>`,
  });
  if (!result) return [];
  const created: Memory[] = [];
  for (const p of result.memories.slice(0, 3)) {
    const isCorrection = Boolean(p.corrects_existing_title);
    const status = args.mode === "suggest" ? "proposed" : isCorrection ? "uncertain" : p.confidence >= 0.8 ? "active" : "proposed";
    const r = await createMemory(
      {
        workspaceId: args.workspaceId,
        layer: p.layer,
        category: p.category.toLowerCase().slice(0, 64) || "general",
        title: p.title.slice(0, 200),
        content: isCorrection ? `${p.content}\n(Mögliche Korrektur von: "${p.corrects_existing_title}" – bitte prüfen.)` : p.content,
        importance: Math.min(5, Math.max(1, p.importance)),
        confidence: Math.min(1, Math.max(0, p.confidence)),
        status,
        source: "conversation",
        sourceRef: args.messageId,
      },
      "jarvis",
    );
    if (r.kind === "created") created.push(r.memory);
  }
  return created;
}
