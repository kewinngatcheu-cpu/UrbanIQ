"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Listener, Speaker, browserSttSupported, loadVoiceConfig, micSupported, type VoiceConfig } from "@/lib/client/voiceEngine";
import { splitSentences, toSpeech } from "@/lib/voice/speechText";

/**
 * Chat-page voice: push-to-talk input and spoken replies via the shared JARVIS voice engine
 * (server voice when configured, browser speech otherwise).
 */
export function useVoice(onFinal: (text: string) => void) {
  const cfgRef = useRef<VoiceConfig | null>(null);
  const speaker = useRef<Speaker | null>(null);
  const listener = useRef<Listener | null>(null);
  const [supported, setSupported] = useState({ stt: false, tts: false });
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    speaker.current = new Speaker(() => cfgRef.current);
    listener.current = new Listener(() => cfgRef.current);
    listener.current.onInterim = setInterim;
    speaker.current.onError = setError;
    loadVoiceConfig().then((c) => {
      cfgRef.current = c;
      setSupported({ stt: micSupported() || browserSttSupported(), tts: c.tts.provider !== "browser" || "speechSynthesis" in window });
    }).catch(() => setSupported({ stt: browserSttSupported(), tts: "speechSynthesis" in window }));
    return () => { speaker.current?.stop(); listener.current?.cancel(); };
  }, []);

  const start = useCallback(async () => {
    if (!listener.current || listener.current.active) return;
    speaker.current?.unlock();
    speaker.current?.stop(); // barge-in
    setError(null); setInterim(""); setListening(true);
    const r = await listener.current.listen();
    setListening(false); setInterim("");
    if ("text" in r) onFinalRef.current(r.text);
    else if ("error" in r) setError(r.error);
  }, []);

  const stop = useCallback(() => listener.current?.stop(), []);

  const speak = useCallback((text: string) => {
    speaker.current?.stop();
    for (const chunk of splitSentences(toSpeech(text), 60)) speaker.current?.enqueue(chunk);
  }, []);

  const stopSpeaking = useCallback(() => speaker.current?.stop(), []);
  const unlock = useCallback(() => speaker.current?.unlock(), []);

  return { supported, listening, interim, error, start, stop, speak, stopSpeaking, unlock };
}
