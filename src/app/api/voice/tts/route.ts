import { z } from "zod";
import { api, clientIp, HttpError, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/auth/rateLimit";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { resolveVoice } from "@/lib/voice/providers";
import { toSpeech } from "@/lib/voice/speechText";

export const runtime = "nodejs";

const body = z.object({ text: z.string().min(1).max(4000) });

/** Streams synthesized speech (audio/mpeg). 409 when no server TTS is available – the client then uses the browser voice. */
export const POST = api(async (req) => {
  if (!rateLimit(`tts:${clientIp(req)}`, 120, 60_000).ok) throw new HttpError(429, "Zu viele Sprachanfragen.");
  const { text } = body.parse(await readJson(req, 20_000));
  const s = await getSettings();
  const { tts: provider } = await resolveVoice(s);
  if (!provider) throw new HttpError(409, "Keine Server-Stimme konfiguriert – Browser-Stimme verwenden.");
  const speech = toSpeech(text);
  if (!speech) throw new HttpError(400, "Kein sprechbarer Text.");
  try {
    const audio = await provider.synthesize(speech, { voice: s.voiceName, speed: s.voiceSpeed, lang: s.language }, req.signal);
    // Log usage only (characters), never the spoken content.
    await audit({ actor: "jarvis", action: "voice.tts", level: 1, details: { provider: provider.id, chars: speech.length } });
    return new Response(audio.body, { headers: { "Content-Type": audio.contentType, "Cache-Control": "no-store" } });
  } catch (e) {
    await audit({ actor: "jarvis", action: "voice.tts", level: 1, status: "failed", details: { provider: provider.id, error: String(e).slice(0, 300) } });
    throw new HttpError(502, `Sprachausgabe fehlgeschlagen (${provider.label}).`);
  }
});
