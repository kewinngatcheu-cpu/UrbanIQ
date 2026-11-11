import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshDb } from "./helpers";
import { PROVIDERS } from "@/lib/ai/registry";
import { handleChat, type ChatEvent } from "@/lib/ai/chat";
import { createMemory } from "@/lib/memory/service";
import { updateSettings } from "@/lib/settings";
import type { Db } from "@/lib/db";

/**
 * AI path with a simulated provider (no network). Verifies orchestration: context retrieval,
 * streaming, persistence, audit, memory proposals and that provider errors surface honestly.
 */
let db: Db;
beforeEach(async () => {
  db = await freshDb();
  process.env.ANTHROPIC_API_KEY = "test-key-not-real";
});
afterEach(() => { vi.restoreAllMocks(); delete process.env.ANTHROPIC_API_KEY; });

const run = async (message: string, workspaceId = "ngcx") => {
  const events: ChatEvent[] = [];
  await handleChat({ message, workspaceId }, (e) => events.push(e));
  return events;
};

describe("chat AI path (simulated provider)", () => {
  it("streams, persists, retrieves workspace context and proposes memories for approval", async () => {
    await createMemory({ workspaceId: "ngcx", layer: "business", title: "NGCX Zielmarkt", content: "IT-Dienstleister und IT-Beratungen." }, "owner");
    await createMemory({ workspaceId: "venturesx", layer: "business", title: "VX Geheimnis", content: "Nur für VenturesX." }, "owner");
    let systemSeen = "";
    vi.spyOn(PROVIDERS.anthropic, "stream").mockImplementation(async (p, onDelta) => {
      systemSeen = p.system;
      onDelta("Fokus: "); onDelta("Interviews.");
      return { text: "Fokus: Interviews.", model: "claude-opus-5-5", provider: "anthropic", inputTokens: 10, outputTokens: 4, stopReason: "end_turn" };
    });
    vi.spyOn(PROVIDERS.anthropic, "json").mockResolvedValue({
      memories: [{ title: "Interviewziel", content: "Kewin will bis Monatsende 10 Interviews führen.", layer: "business", category: "validierung", importance: 4, confidence: 0.9, corrects_existing_title: null }],
    } as never);

    const ev = await run("Ich will bis Monatsende 10 Interviews mit IT-Beratungen führen. Was ist der Zielmarkt?");
    const ctx = ev.find((e) => e.type === "context") as Extract<ChatEvent, { type: "context" }>;
    expect(ctx.provider).toBe("anthropic");
    expect(ctx.memories.map((m) => m.title)).toContain("NGCX Zielmarkt");
    expect(systemSeen).toContain("NGCX Zielmarkt");
    expect(systemSeen).not.toContain("VX Geheimnis");
    expect(ev.filter((e) => e.type === "delta").map((e) => (e as { text: string }).text).join("")).toBe("Fokus: Interviews.");
    expect(ev.find((e) => e.type === "done")).toMatchObject({ provider: "anthropic", stopReason: "end_turn" });
    const proposals = ev.find((e) => e.type === "memory_proposals") as Extract<ChatEvent, { type: "memory_proposals" }>;
    expect(proposals.memories[0]).toMatchObject({ title: "Interviewziel", status: "proposed" }); // default mode: suggest
    const saved = await db.query<{ role: string; content: string }>(`SELECT role, content FROM messages ORDER BY created_at`);
    expect(saved.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("auto mode stores corrections as 'uncertain' instead of overwriting", async () => {
    await updateSettings({ memoryMode: "auto" });
    vi.spyOn(PROVIDERS.anthropic, "stream").mockResolvedValue({ text: "Notiert.", model: "m", provider: "anthropic", stopReason: "end_turn" });
    vi.spyOn(PROVIDERS.anthropic, "json").mockResolvedValue({
      memories: [{ title: "Phase NGCX", content: "NGCX ist jetzt in der Pilotphase.", layer: "business", category: "status", importance: 4, confidence: 0.95, corrects_existing_title: "NGCX Phase" }],
    } as never);
    const ev = await run("NGCX ist jetzt in der Pilotphase.");
    const p = ev.find((e) => e.type === "memory_proposals") as Extract<ChatEvent, { type: "memory_proposals" }>;
    expect(p.memories[0].status).toBe("uncertain");
  });

  it("reports provider failures as errors and logs them", async () => {
    vi.spyOn(PROVIDERS.anthropic, "stream").mockRejectedValue(new Error("401 invalid x-api-key"));
    const ev = await run("Hallo");
    expect(ev.find((e) => e.type === "error")).toMatchObject({ code: "provider_error" });
    const failed = await db.query(`SELECT 1 FROM audit_log WHERE action = 'chat.respond' AND status = 'failed'`);
    expect(failed).toHaveLength(1);
  });

  it("respects the integration switch: disabled provider means no AI call", async () => {
    await db.query(`INSERT INTO integrations (id, enabled) VALUES ('anthropic', false)`);
    const spy = vi.spyOn(PROVIDERS.anthropic, "stream");
    const ev = await run("Hallo");
    expect(spy).not.toHaveBeenCalled();
    expect(ev.find((e) => e.type === "error")).toMatchObject({ code: "no_provider" });
  });
});
