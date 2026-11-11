"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Push-to-talk + spoken replies via the browser's built-in speech APIs (Phase 4 preview).
 * Honest limits: needs a supporting browser (Safari/Chrome); recognition may be processed by the
 * browser vendor's servers; no background listening or wake word in a web app.
 */
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export function useVoice(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState({ stt: false, tts: false });
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported({ stt: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition), tts: "speechSynthesis" in window });
  }, []);

  const start = useCallback((lang = "de-DE") => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return setError("Spracherkennung wird von diesem Browser nicht unterstützt.");
    window.speechSynthesis?.cancel(); // interrupt JARVIS when the user starts talking
    const rec = new Ctor();
    rec.lang = lang; rec.interimResults = true; rec.continuous = false;
    finalRef.current = ""; setInterim(""); setError(null);
    rec.onresult = (e) => {
      let fin = "", int = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript; else int += r[0].transcript;
      }
      finalRef.current = fin; setInterim(fin + int);
    };
    rec.onerror = (e) => { if (e.error !== "aborted" && e.error !== "no-speech") setError(`Spracherkennung: ${e.error}`); };
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      setInterim("");
      if (text) onFinal(text);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [onFinal]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const speak = useCallback((text: string, lang = "de-DE") => {
    if (!("speechSynthesis" in window)) return;
    const clean = text.replace(/```[\s\S]*?```/g, " Codeblock ausgelassen. ").replace(/[*#`>_]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean.slice(0, 4000));
    u.lang = lang;
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith(lang.slice(0, 2)));
    const preferred = voices.find((v) => /Anna|Helena|Markus|Yannick|Premium|Enhanced|Neural/i.test(v.name)) ?? voices[0];
    if (preferred) u.voice = preferred;
    u.rate = 1.02; u.pitch = 0.95;
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeaking = useCallback(() => window.speechSynthesis?.cancel(), []);

  return { supported, listening, interim, error, start, stop, speak, stopSpeaking };
}
