import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { TTS_PROVIDERS, resolveVoice } from "@/lib/voice/providers";

/** What the client should use for speech in/out. "browser" = Web Speech APIs (no server provider configured or chosen). */
export const GET = api(async () => {
  const s = await getSettings();
  const { tts, stt } = await resolveVoice(s);
  return NextResponse.json({
    tts: tts ? { provider: tts.id, label: tts.label } : { provider: "browser", label: "Browser-Stimme" },
    stt: stt ? { provider: stt.id, label: stt.label } : { provider: "browser", label: "Browser-Spracherkennung" },
    settings: { voiceTts: s.voiceTts, voiceStt: s.voiceStt, voiceName: s.voiceName, voiceSpeed: s.voiceSpeed, voiceAutoSpeak: s.voiceAutoSpeak, language: s.language },
    available: Object.values(TTS_PROVIDERS).map((p) => ({ id: p.id, label: p.label, configured: p.configured(), voices: p.voices })),
  });
});
