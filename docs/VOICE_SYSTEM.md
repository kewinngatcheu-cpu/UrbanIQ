# Voice system

JARVIS can talk and listen. Voice works out of the box with the browser's built-in speech; for a natural, consistent JARVIS voice and reliable German recognition, connect a server voice.

## Quality tiers

| Tier | Voice output | Speech recognition | Setup |
|---|---|---|---|
| **Browser** (default, free) | OS/browser voice (`speechSynthesis`, German voice preferred, "Premium/Enhanced" voices on macOS/iOS) | Web Speech API (Safari, Chrome; may be processed by the browser vendor) | none |
| **OpenAI** | `gpt-4o-mini-tts` with JARVIS voice instructions (calm, precise, slightly deep), voice selectable (Onyx, Ash, Cedar …) | `gpt-4o-transcribe`, language `de`, vocabulary hint (NGCX, HWR …), works in every browser incl. iPhone | `OPENAI_API_KEY` |
| **ElevenLabs** (preferred when set) | `eleven_multilingual_v2`, any voice from your ElevenLabs library (incl. a custom/cloned voice) | – (uses OpenAI or browser) | `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` |

`Settings → Stimme` chooses the provider (`auto` picks ElevenLabs → OpenAI → browser), voice, speaking rate and recognition, and has a **Stimme testen** button. Each server provider can also be switched off in Integrations; JARVIS then falls back to the browser voice.

## Architecture

```
 Voice mode (/voice)  ─ tap / Space ─►  Listener
   MediaRecorder + VAD (RMS, noise calibration, stop after 1.3 s silence, 60 s cap)
     ├─ server STT:  POST /api/voice/stt (multipart, ≤10 MB, audio never stored) → text
     └─ fallback:    Web Speech API (de-DE)
   text ─► POST /api/chat {mode:"voice"}  (NDJSON stream)
     ├─ voice intents (deterministic, no AI needed): briefing · merke dir · neue Aufgabe · wie viel kann ich ausgeben · starte Fokus
     └─ AI answer with VOICE_RULES (2–5 spoken sentences, no markdown)
   deltas ─► SentenceStream (abbreviation/decimal-safe) ─► Speaker queue
     ├─ server TTS:  POST /api/voice/tts per sentence → audio/mpeg, next sentence prefetched while the current one plays
     └─ fallback:    speechSynthesis per sentence
   barge-in: tap / Space stops playback immediately and starts listening
   hands-free: after JARVIS finishes speaking, listening restarts automatically (stops after one silent turn)
```

Key files: `src/lib/voice/providers.ts` (adapters + resolution), `src/lib/voice/speechText.ts` (markdown→speech, sentence splitting), `src/lib/client/voiceEngine.ts` (Speaker/Listener), `src/app/(app)/voice/VoiceClient.tsx`, `src/lib/myday.ts → spokenBriefing()`, `src/lib/ai/commands.ts → parseVoiceIntent()`.

## Spoken commands (work without any AI key)

| Say | Result |
|---|---|
| "Guten Morgen, JARVIS" / "Was steht heute an?" / "Briefing" | Spoken daily briefing from real data (priorities, ventures, exam, habits, finance if allowed, biggest risk, suggestion) |
| "Merke dir, dass …" | Memory stored in the current workspace (duplicate check applies) |
| "Neue Aufgabe: …, wichtig" / "Erinnere mich daran, …" | Task created (priority from "wichtig/hoch", "kritisch/dringend", "niedrig") |
| "Wie viel kann ich diesen Monat ausgeben?" | Spoken answer from the finance module (respects the privacy switch) |
| "Starte Fokus für 25 Minuten" | Server-side focus session started |
| anything else | Answered by the AI core in spoken style (needs `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) |

Natural-language intents are active in voice mode only; typed chat keeps the explicit `/merke` and `/aufgabe` commands.

## Privacy

- Audio recordings are sent to the STT provider only to transcribe, then discarded; nothing is stored.
- The audit log records provider and size (characters/bytes) of each speech request, never the content.
- The spoken briefing only includes finance figures when `aiContextFinance` is on (they would otherwise be read aloud and, with a server voice, sent to the TTS provider).
- The microphone is only open while JARVIS is listening (indicator: orb "Hört zu").

## Honest limits

- **No background listening / wake word ("Hey JARVIS")** in a browser tab – iOS and browsers don't allow it. Hands-free mode only works while the voice page is open and active.
  Path: native macOS menu-bar app with on-device keyword spotting; on iPhone, a Siri Shortcut ("Hey Siri, JARVIS") that opens `/voice` (Phase 8).
- iOS Safari requires one tap before audio can play (handled: the first tap unlocks audio).
- Browser voices vary by device; for a consistent JARVIS voice across MacBook, iPad and iPhone use a server voice.
- The OpenAI and ElevenLabs adapters are implemented against their official APIs and covered by tests with simulated providers; they were not called with real keys during development.
- Barge-in by voice while JARVIS is speaking (without tapping) is not enabled: speaker echo would trigger false interruptions without dedicated echo handling.
