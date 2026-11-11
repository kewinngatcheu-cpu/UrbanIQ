import { NextResponse } from "next/server";
import { api, clientIp, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/auth/rateLimit";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { resolveVoice } from "@/lib/voice/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^audio\/(webm|mp4|mpeg|mp3|m4a|x-m4a|wav|x-wav|ogg|aac)(;.*)?$/;

/** multipart/form-data with field "audio". The recording is transcribed and discarded – audio is never stored. */
export const POST = api(async (req) => {
  if (!rateLimit(`stt:${clientIp(req)}`, 40, 60_000).ok) throw new HttpError(429, "Zu viele Sprachanfragen.");
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 10_000) throw new HttpError(413, "Aufnahme zu lang (max. 10 MB).");
  const s = await getSettings();
  const { stt: provider } = await resolveVoice(s);
  if (!provider) throw new HttpError(409, "Keine Server-Spracherkennung konfiguriert – Browser-Spracherkennung verwenden.");
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) throw new HttpError(400, "Feld 'audio' fehlt.");
  if (audio.size > MAX_BYTES) throw new HttpError(413, "Aufnahme zu lang (max. 10 MB).");
  if (audio.size < 800) return NextResponse.json({ text: "" }); // too short to contain speech
  if (!ALLOWED.test(audio.type)) throw new HttpError(415, `Audioformat nicht unterstützt: ${audio.type || "unbekannt"}`);
  const ext = audio.type.includes("mp4") || audio.type.includes("m4a") ? "m4a" : audio.type.includes("wav") ? "wav" : audio.type.includes("ogg") ? "ogg" : audio.type.includes("mpeg") || audio.type.includes("mp3") ? "mp3" : "webm";
  try {
    const text = await provider.transcribe(audio, `aufnahme.${ext}`, s.language);
    await audit({ actor: "jarvis", action: "voice.stt", level: 1, details: { provider: provider.id, bytes: audio.size } });
    return NextResponse.json({ text });
  } catch (e) {
    await audit({ actor: "jarvis", action: "voice.stt", level: 1, status: "failed", details: { provider: provider.id, error: String(e).slice(0, 300) } });
    throw new HttpError(502, "Spracherkennung fehlgeschlagen.");
  }
});
