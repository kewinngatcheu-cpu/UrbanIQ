# Voice system

## Today (Phase 1 preview – real, but browser-dependent)

- **Push-to-talk** in the chat (`useVoice.ts`) via the Web Speech API, language `de-DE`. Interim transcript is shown; the final transcript is sent as a message.
- **Spoken replies** via `speechSynthesis`, German voice preferred (Anna/Helena/Markus or "Premium/Enhanced" voices on macOS/iOS). Toggle in the chat header, remembered per device.
- Interruption: starting push-to-talk cancels current speech.
- Limits (stated honestly): availability differs by browser; recognition may be processed by the browser vendor (Apple/Google); voice quality depends on installed OS voices; **no background listening and no wake word** in a web app.

## Target architecture (Phase 4)

```
 mic ─► VAD (client) ─► streaming STT provider (adapter) ─► chat pipeline ─► text stream
                                                                     └─► streaming TTS provider (adapter) ─► audio playback on the active device
```

- Adapters: `SpeechToText` / `TextToSpeech` interfaces; candidates evaluated for German quality, latency, privacy and price (e.g. OpenAI realtime/transcription, Deepgram, ElevenLabs, Azure Speech). Keys server-side; audio streamed through the JARVIS backend.
- Barge-in: client VAD stops playback when the owner speaks.
- Device awareness: audio plays only on the device that initiated the request.
- Morning/evening briefing rendered as text and German audio.

## Wake word ("Hey JARVIS")

Not possible reliably in a browser tab. Options for Phase 8: native macOS menu-bar app (on-device keyword spotting, e.g. Porcupine) and iOS Shortcuts/Siri intent ("Hey Siri, JARVIS") – iOS does not allow third-party always-on wake words.
