import "server-only";

/**
 * Speech provider adapters (server-side, keys never reach the browser).
 * TTS: OpenAI (gpt-4o-mini-tts, voice character via instructions) or ElevenLabs (multilingual, highest German quality).
 * STT: OpenAI (gpt-4o-transcribe, language "de").
 * When nothing is configured the browser's built-in speech APIs are used (decided client-side) – never a fake.
 */

export type TtsId = "openai" | "elevenlabs";
export type SttId = "openai";

export interface TtsOptions { voice?: string; speed?: number; lang?: "de" | "en" }
export interface TtsProvider {
  id: TtsId;
  label: string;
  configured(): boolean;
  voices: { id: string; label: string }[];
  synthesize(text: string, opts: TtsOptions, signal?: AbortSignal): Promise<{ body: ReadableStream<Uint8Array>; contentType: string }>;
}
export interface SttProvider {
  id: SttId;
  label: string;
  configured(): boolean;
  transcribe(audio: Blob, filename: string, lang: "de" | "en"): Promise<string>;
}

/** The JARVIS voice character, applied by models that accept style instructions. */
export const JARVIS_VOICE_INSTRUCTIONS =
  "Du bist JARVIS, ein hochintelligenter persönlicher KI-Assistent. Sprich ruhig, souverän und präzise, mit leicht tiefer, " +
  "warmer Stimme und natürlicher deutscher Betonung. Gelassenes, zügiges Tempo, kurze Pausen an Satzenden. " +
  "Kein Enthusiasmus, keine Übertreibung – professionell und trocken, wie ein erfahrener Chief of Staff.";

export const openaiTts: TtsProvider = {
  id: "openai",
  label: "OpenAI gpt-4o-mini-tts",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  voices: [
    { id: "onyx", label: "Onyx – tief, ruhig" },
    { id: "ash", label: "Ash – klar, neutral" },
    { id: "cedar", label: "Cedar – warm" },
    { id: "echo", label: "Echo – sachlich" },
    { id: "sage", label: "Sage – weich" },
    { id: "marin", label: "Marin – hell" },
  ],
  async synthesize(text, opts, signal) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.audio.speech.create(
      {
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: opts.voice || "onyx",
        input: text,
        instructions: opts.lang === "en" ? JARVIS_VOICE_INSTRUCTIONS.replace("natürlicher deutscher Betonung", "natural English pronunciation") : JARVIS_VOICE_INSTRUCTIONS,
        response_format: "mp3",
        speed: opts.speed ?? 1.0,
      },
      { signal },
    );
    if (!res.body) throw new Error("OpenAI TTS lieferte keine Audiodaten.");
    return { body: res.body as unknown as ReadableStream<Uint8Array>, contentType: "audio/mpeg" };
  },
};

export const elevenlabsTts: TtsProvider = {
  id: "elevenlabs",
  label: "ElevenLabs Multilingual",
  configured: () => Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID),
  voices: [{ id: "env", label: "Stimme aus ELEVENLABS_VOICE_ID" }],
  async synthesize(text, opts, signal) {
    const voiceId = process.env.ELEVENLABS_VOICE_ID!;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`, {
      method: "POST",
      signal,
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.15, speed: opts.speed ?? 1.0 },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`ElevenLabs TTS Fehler ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    return { body: res.body, contentType: "audio/mpeg" };
  },
};

export const openaiStt: SttProvider = {
  id: "openai",
  label: "OpenAI gpt-4o-transcribe",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  async transcribe(audio, filename, lang) {
    const { default: OpenAI, toFile } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await toFile(Buffer.from(await audio.arrayBuffer()), filename, { type: audio.type || "audio/webm" });
    const res = await client.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_STT_MODEL || "gpt-4o-transcribe",
      language: lang,
      // Domain vocabulary improves recognition of names the model can't know.
      prompt: "JARVIS, Kewin, NGCX, VenturesX, HWR Berlin, Decision Intelligence, KPI, ECTS.",
    });
    return (res as { text: string }).text?.trim() ?? "";
  },
};

export const TTS_PROVIDERS: Record<TtsId, TtsProvider> = { openai: openaiTts, elevenlabs: elevenlabsTts };

export type TtsSetting = "auto" | "browser" | TtsId;

/** auto → ElevenLabs if configured, else OpenAI, else browser. An explicit choice that is not configured falls back to browser. */
export function resolveTts(setting: TtsSetting): TtsProvider | null {
  if (setting === "browser") return null;
  if (setting === "auto") return [elevenlabsTts, openaiTts].find((p) => p.configured()) ?? null;
  const p = TTS_PROVIDERS[setting];
  return p.configured() ? p : null;
}

export function resolveStt(setting: "auto" | "browser" | SttId): SttProvider | null {
  if (setting === "browser") return null;
  return openaiStt.configured() ? openaiStt : null;
}

/** Like resolveTts/resolveStt, but also honours the owner's on/off switch for each connector (Integrations page). */
export async function resolveVoice(s: { voiceTts: TtsSetting; voiceStt: "auto" | "browser" | SttId }) {
  const { listConnectorStatus } = await import("@/lib/integrations");
  const status = await listConnectorStatus();
  const on = (id: string) => status.find((c) => c.id === id)?.status === "connected";
  let tts: TtsProvider | null;
  if (s.voiceTts === "browser") tts = null;
  else if (s.voiceTts === "auto") tts = [elevenlabsTts, openaiTts].find((p) => p.configured() && on(p.id)) ?? null;
  else tts = TTS_PROVIDERS[s.voiceTts].configured() && on(s.voiceTts) ? TTS_PROVIDERS[s.voiceTts] : null;
  const stt = s.voiceStt !== "browser" && openaiStt.configured() && on("openai") ? openaiStt : null;
  return { tts, stt };
}
