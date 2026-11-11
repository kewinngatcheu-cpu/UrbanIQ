import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { freshDb } from "./helpers";
import { toSpeech, splitSentences, SentenceStream } from "@/lib/voice/speechText";
import { parseVoiceIntent, parseCommand } from "@/lib/ai/commands";
import { spokenBriefing, spokenEUR, buildBriefing } from "@/lib/myday";
import { handleChat, type ChatEvent } from "@/lib/ai/chat";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { createTask } from "@/lib/tasks";
import { updateSettings } from "@/lib/settings";
import { openaiTts, elevenlabsTts, openaiStt, resolveVoice } from "@/lib/voice/providers";
import type { Db } from "@/lib/db";

describe("speech text preparation", () => {
  it("removes markdown, code and links", () => {
    expect(toSpeech("## Fokus\n**Wichtig:** Starte mit `NGCX`.\n- Punkt eins\n- Punkt zwei\n[Mehr](https://x.de)\n```js\nx()\n```"))
      .toBe("Fokus. Wichtig: Starte mit NGCX. Punkt eins. Punkt zwei. Mehr (Codeblock ausgelassen.)");
  });
  it("splits into sentences without breaking abbreviations or decimals", () => {
    const s = splitSentences("Das kostet ca. 3.5 Prozent mehr. Danach sind z. B. Abos dran! Ende?", 1);
    expect(s).toEqual(["Das kostet ca. 3.5 Prozent mehr.", "Danach sind z. B. Abos dran!", "Ende?"]);
    expect(splitSentences("Kurz. Auch kurz. Das hier ist ein längerer Satz mit Inhalt.", 20)).toEqual(["Kurz. Auch kurz. Das hier ist ein längerer Satz mit Inhalt."]);
  });
  it("streams sentences incrementally so speech can start early", () => {
    const st = new SentenceStream(20);
    expect(st.push("Deine wichtigste Priorität ist NGCX")).toEqual([]);
    expect(st.push(". Danach kommt die Uni, z. B. Finanz")).toEqual(["Deine wichtigste Priorität ist NGCX."]);
    expect(st.push("mathematik mit 3.5 Stunden. Ende")).toEqual(["Danach kommt die Uni, z. B. Finanzmathematik mit 3.5 Stunden."]);
    expect(st.flush()).toEqual(["Ende"]);
  });
});

describe("voice intents", () => {
  it("recognises greetings and briefing requests", () => {
    for (const s of ["Guten Morgen, JARVIS.", "Hey JARVIS", "Jarvis, was steht heute an?", "Gib mir mein Briefing"]) expect(parseVoiceIntent(s), s).toEqual({ kind: "briefing" });
  });
  it("turns 'merke dir' and task phrasings into commands", () => {
    expect(parseVoiceIntent("Merke dir, dass ich dienstags keine Vorlesung habe")).toEqual({ kind: "remember", text: "Ich dienstags keine Vorlesung habe" });
    expect(parseVoiceIntent("JARVIS, neue Aufgabe: Angebot für Müller GmbH schreiben, hoch")).toEqual({ kind: "task", title: "Angebot für Müller GmbH schreiben", priority: "high", dueAt: null });
    expect(parseVoiceIntent("Erstelle eine Aufgabe Pitchdeck überarbeiten")).toMatchObject({ kind: "task", title: "Pitchdeck überarbeiten", priority: "medium" });
    expect(parseVoiceIntent("Erinnere mich daran, die Miete zu überweisen, dringend")).toMatchObject({ kind: "task", title: "Die Miete zu überweisen", priority: "critical" });
  });
  it("recognises finance and focus requests, leaves everything else to the AI", () => {
    expect(parseVoiceIntent("Wie viel kann ich diesen Monat noch ausgeben?")).toEqual({ kind: "spendable" });
    expect(parseVoiceIntent("Starte Fokus für 25 Minuten")).toEqual({ kind: "focus", minutes: 25 });
    expect(parseVoiceIntent("Starte eine Fokus-Session")).toEqual({ kind: "focus", minutes: 50 });
    expect(parseVoiceIntent("Was denkst du über die Preisstrategie von NGCX?")).toBeNull();
    expect(parseVoiceIntent("Wie kann ich mehr Kunden gewinnen")).toBeNull();
    // Natural-language intents are voice-only; typed chat keeps explicit slash commands.
    expect(parseCommand("Merke dir das")).toBeNull();
  });
  it("speaks amounts naturally", () => {
    expect(spokenEUR(80551)).toBe("805 Euro");
    expect(spokenEUR(1250)).toBe("12 Euro 50");
    expect(spokenEUR(-4000)).toBe("minus 40 Euro");
    expect(spokenEUR(250000)).toBe("2.500 Euro");
  });
});

describe("voice in the chat pipeline", () => {
  let db: Db;
  beforeEach(async () => { db = await freshDb(); await db.query(`INSERT INTO owner (display_name, password_hash) VALUES ('Kewin','x')`); });
  const run = async (message: string, mode: "voice" | "text" = "voice", workspaceId = "personal") => {
    const ev: ChatEvent[] = [];
    await handleChat({ message, workspaceId, mode }, (e) => ev.push(e));
    return { ev, text: ev.filter((e) => e.type === "delta").map((e) => (e as { text: string }).text).join("") };
  };

  it("'Guten Morgen' speaks a data-backed briefing without any AI key", async () => {
    await createTask({ workspaceId: "ngcx", title: "Interviewleitfaden finalisieren", priority: "critical" }, "owner");
    const { ev, text } = await run("Guten Morgen, JARVIS.");
    expect(ev.find((e) => e.type === "action")).toMatchObject({ action: "briefing.read", status: "succeeded" });
    expect(text).toMatch(/^Guten (Morgen|Tag|Abend), Kewin\./);
    expect(text).toContain("Deine wichtigste Priorität: Interviewleitfaden finalisieren.");
    expect(text).toContain("NGCX:");
    expect(text).not.toMatch(/[*#`()]/);
    expect(text).toContain("Mein Vorschlag: Starte jetzt eine Fokus-Session von 45 Minuten für Interviewleitfaden finalisieren.");
  });

  it("voice commands create real memories, tasks and focus sessions", async () => {
    expect((await run("Merke dir, dass mein Lieblingsessen Ndolé ist")).ev.find((e) => e.type === "action")).toMatchObject({ action: "memory.create", status: "succeeded" });
    expect((await run("Neue Aufgabe: Steuerunterlagen sortieren, wichtig")).ev.find((e) => e.type === "action")).toMatchObject({ action: "task.create", status: "succeeded" });
    const [t] = await db.query<{ priority: string }>(`SELECT priority FROM tasks WHERE title = 'Steuerunterlagen sortieren'`);
    expect(t.priority).toBe("high");
    const f = await run("Starte Fokus für 25 Minuten");
    expect(f.text).toContain("25 Minuten");
    const twice = await run("Starte Fokus für 25 Minuten");
    expect(twice.ev.find((e) => e.type === "action")).toMatchObject({ action: "focus.start", status: "failed" });
  });

  it("finance by voice: honest without data, respects the privacy switch", async () => {
    expect((await run("Wie viel kann ich diesen Monat ausgeben?")).text).toContain("keine Buchungen");
    await updateSettings({ aiContextFinance: false });
    expect((await run("Wie viel kann ich diesen Monat ausgeben?")).text).toContain("nicht freigegeben");
  });

  it("typed chat is not intercepted by natural-language voice intents", async () => {
    const { ev } = await run("Merke dir, dass ich Kaffee mag", "text");
    expect(ev.find((e) => e.type === "error")).toMatchObject({ code: "no_provider" });
  });

  it("spoken briefing omits finance unless allowed", async () => {
    const b = await buildBriefing();
    const withFin = { ...b, finance: { available: 50000, perDay: 2500, daysLeft: 20, warnings: [] } };
    expect(spokenBriefing(withFin, { name: "Kewin", includeFinance: true })).toContain("500 Euro verfügbar");
    expect(spokenBriefing(withFin, { name: "Kewin", includeFinance: false })).not.toContain("Euro");
  });

  it("adds spoken-style rules to the system prompt only in voice mode", () => {
    const ws = { id: "personal", name: "Persönlich", kind: "personal" as const, description: "", profile: {}, color: "#000", archived: false, created_at: "", updated_at: "" };
    expect(buildSystemPrompt({ workspace: ws, memories: [], tasks: [], voice: true })).toContain("Sprachmodus");
    expect(buildSystemPrompt({ workspace: ws, memories: [], tasks: [] })).not.toContain("Sprachmodus");
  });
});

describe("voice providers and routes", () => {
  let db: Db;
  beforeEach(async () => { db = await freshDb(); });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.OPENAI_API_KEY; delete process.env.ELEVENLABS_API_KEY; delete process.env.ELEVENLABS_VOICE_ID; });

  it("resolves the best configured provider and honours the integration switch", async () => {
    const base = { voiceTts: "auto" as const, voiceStt: "auto" as const };
    expect(await resolveVoice(base)).toEqual({ tts: null, stt: null });
    process.env.OPENAI_API_KEY = "test";
    expect((await resolveVoice(base)).tts?.id).toBe("openai");
    expect((await resolveVoice(base)).stt?.id).toBe("openai");
    process.env.ELEVENLABS_API_KEY = "test"; process.env.ELEVENLABS_VOICE_ID = "v";
    expect((await resolveVoice(base)).tts?.id).toBe("elevenlabs");
    expect((await resolveVoice({ ...base, voiceTts: "browser" })).tts).toBeNull();
    await db.query(`INSERT INTO integrations (id, enabled) VALUES ('elevenlabs', false), ('openai', false)`);
    expect(await resolveVoice(base)).toEqual({ tts: null, stt: null });
  });

  async function authed(path: string, init: { method: string; body?: BodyInit; headers?: Record<string, string> }) {
    const { createSession } = await import("@/lib/auth/session");
    const s = await createSession("vitest");
    return new NextRequest(`http://localhost${path}`, { ...init, headers: { host: "localhost", origin: "http://localhost", cookie: `jarvis_session=${s.token}`, ...(init.headers ?? {}) } });
  }

  it("TTS route: 409 without a server voice, audio stream with one, logs only the length", async () => {
    const { POST } = await import("@/app/api/voice/tts/route");
    const body = JSON.stringify({ text: "**Guten Morgen**, Kewin." });
    const r409 = await POST(await authed("/api/voice/tts", { method: "POST", body, headers: { "content-type": "application/json" } }), undefined as never);
    expect(r409.status).toBe(409);
    process.env.OPENAI_API_KEY = "test";
    const spy = vi.spyOn(openaiTts, "synthesize").mockResolvedValue({ body: new Blob([new Uint8Array([1, 2, 3])]).stream(), contentType: "audio/mpeg" });
    const ok = await POST(await authed("/api/voice/tts", { method: "POST", body, headers: { "content-type": "application/json" } }), undefined as never);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("audio/mpeg");
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(spy.mock.calls[0][0]).toBe("Guten Morgen, Kewin."); // markdown removed before synthesis
    const [log] = await db.query<{ details: { chars: number; text?: string } }>(`SELECT details FROM audit_log WHERE action = 'voice.tts'`);
    expect(log.details.chars).toBe(20);
    expect(JSON.stringify(log.details)).not.toContain("Kewin");
    void elevenlabsTts;
  });

  it("STT route: validates type/size, transcribes, never stores audio", async () => {
    const { POST } = await import("@/app/api/voice/stt/route");
    process.env.OPENAI_API_KEY = "test";
    const spy = vi.spyOn(openaiStt, "transcribe").mockResolvedValue("Guten Morgen JARVIS");
    const form = (type: string, size: number) => { const f = new FormData(); f.append("audio", new Blob([new Uint8Array(size)], { type }), "a"); return f; };
    const bad = await POST(await authed("/api/voice/stt", { method: "POST", body: form("text/plain", 5000) }), undefined as never);
    expect(bad.status).toBe(415);
    const ok = await POST(await authed("/api/voice/stt", { method: "POST", body: form("audio/webm", 5000) }), undefined as never);
    expect(await ok.json()).toEqual({ text: "Guten Morgen JARVIS" });
    expect(spy.mock.calls[0][1]).toBe("aufnahme.webm");
    const tiny = await POST(await authed("/api/voice/stt", { method: "POST", body: form("audio/webm", 100) }), undefined as never);
    expect(await tiny.json()).toEqual({ text: "" });
  });

  it("voice routes require a session", async () => {
    const { POST } = await import("@/app/api/voice/tts/route");
    const r = await POST(new NextRequest("http://localhost/api/voice/tts", { method: "POST", body: "{}", headers: { host: "localhost", origin: "http://localhost" } }), undefined as never);
    expect(r.status).toBe(401);
  });
});
