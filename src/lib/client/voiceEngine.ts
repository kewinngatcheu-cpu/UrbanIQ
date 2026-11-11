"use client";
/**
 * JARVIS voice engine (browser side).
 *
 * Output (Speaker): sentence chunks are synthesized by the server (/api/voice/tts → OpenAI/ElevenLabs) and played
 * back-to-back; the next chunk is fetched while the current one plays, so speech starts after the first sentence.
 * Without a server voice it uses the browser's speechSynthesis (German voice preferred). Interruptible at any time.
 *
 * Input (Listener): records with MediaRecorder and a simple voice-activity detector (stops after silence),
 * then transcribes on the server (/api/voice/stt). Without server STT it uses the Web Speech API.
 * Honest limits: no background listening or wake word in a browser tab; the microphone is only active while listening.
 */
import { toSpeech } from "@/lib/voice/speechText";

export type VoiceConfig = {
  tts: { provider: "openai" | "elevenlabs" | "browser"; label: string };
  stt: { provider: "openai" | "browser"; label: string };
  settings: { voiceSpeed: number; voiceAutoSpeak: boolean; language: "de" | "en" };
};

export async function loadVoiceConfig(): Promise<VoiceConfig> {
  const r = await fetch("/api/voice/config", { cache: "no-store" });
  if (!r.ok) throw new Error(`Voice-Konfiguration nicht ladbar (${r.status})`);
  return r.json();
}

const langTag = (l: "de" | "en") => (l === "en" ? "en-US" : "de-DE");

/* ───────────────────────────── Speaker ───────────────────────────── */

type Item = { text: string; url?: Promise<string | null> };

export class Speaker {
  private queue: Item[] = [];
  private audio: HTMLAudioElement | null = null;
  private busy = false;
  private generation = 0; // bumps on stop() so in-flight work is discarded
  private serverFailed = false;
  onSpeaking: (speaking: boolean) => void = () => {};
  onError: (msg: string) => void = () => {};
  /** Resolves when everything queued so far has been spoken (or speech was stopped). */
  private idleWaiters: (() => void)[] = [];

  constructor(private cfg: () => VoiceConfig | null) {}

  get speaking() { return this.busy; }

  /** Must be called from a user gesture once (iOS/Safari autoplay policy). */
  unlock() {
    try {
      if (!this.audio) { this.audio = new Audio(); this.audio.setAttribute("playsinline", ""); }
      // A zero-length WAV unlocks programmatic playback for this element.
      this.audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
      void this.audio.play().catch(() => {});
      if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    } catch { /* ignore */ }
  }

  private useServer() {
    const c = this.cfg();
    return Boolean(c && c.tts.provider !== "browser" && !this.serverFailed);
  }

  /** Queue markdown/plain text; it is cleaned and split by the caller or here. */
  enqueue(text: string) {
    const speech = toSpeech(text);
    if (!speech) return;
    const item: Item = { text: speech };
    if (this.useServer()) item.url = this.fetchAudio(speech, this.generation);
    this.queue.push(item);
    if (!this.busy) void this.run();
  }

  private async fetchAudio(text: string, gen: number): Promise<string | null> {
    try {
      const r = await fetch("/api/voice/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!r.ok) {
        if (r.status === 409 || r.status === 502) this.serverFailed = true;
        const err = await r.json().catch(() => ({ error: `TTS ${r.status}` }));
        if (gen === this.generation) this.onError(`${err.error} Wechsle zur Browser-Stimme.`);
        return null;
      }
      return URL.createObjectURL(await r.blob());
    } catch (e) {
      this.serverFailed = true;
      if (gen === this.generation) this.onError(`Sprachausgabe nicht erreichbar (${(e as Error).message}). Wechsle zur Browser-Stimme.`);
      return null;
    }
  }

  private async run() {
    this.busy = true;
    this.onSpeaking(true);
    const gen = this.generation;
    while (this.queue.length && gen === this.generation) {
      const item = this.queue.shift()!;
      const url = item.url ? await item.url : null;
      if (gen !== this.generation) { if (url) URL.revokeObjectURL(url); break; }
      if (url) await this.playUrl(url);
      else await this.speakBrowser(item.text);
    }
    if (gen === this.generation) {
      this.busy = false;
      this.onSpeaking(false);
      this.idleWaiters.splice(0).forEach((f) => f());
    }
  }

  private playUrl(url: string) {
    return new Promise<void>((resolve) => {
      if (!this.audio) { this.audio = new Audio(); this.audio.setAttribute("playsinline", ""); }
      const a = this.audio;
      const done = () => { a.onended = a.onerror = null; URL.revokeObjectURL(url); resolve(); };
      a.onended = done;
      a.onerror = done;
      a.src = url;
      a.play().catch(() => done());
    });
  }

  private speakBrowser(text: string) {
    return new Promise<void>((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const c = this.cfg();
      const lang = langTag(c?.settings.language ?? "de");
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = c?.settings.voiceSpeed ?? 1.03;
      u.pitch = 0.92;
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
      const preferred = voices.find((v) => /premium|enhanced|neural|natural/i.test(v.name)) ?? voices.find((v) => /Markus|Yannick|Martin|Daniel|Google Deutsch/i.test(v.name)) ?? voices[0];
      if (preferred) u.voice = preferred;
      // Safety timeout: some browsers never fire onend for cancelled utterances.
      const t = setTimeout(resolve, 2000 + text.length * 120);
      u.onend = u.onerror = () => { clearTimeout(t); resolve(); };
      window.speechSynthesis.speak(u);
    });
  }

  /** Interrupt immediately (barge-in). */
  stop() {
    this.generation++;
    this.queue = [];
    if (this.audio) { this.audio.pause(); this.audio.onended = this.audio.onerror = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (this.busy) { this.busy = false; this.onSpeaking(false); }
    this.idleWaiters.splice(0).forEach((f) => f());
  }

  whenIdle(): Promise<void> {
    if (!this.busy && !this.queue.length) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }
}

/* ───────────────────────────── Listener ───────────────────────────── */

export type ListenResult = { text: string } | { error: string } | { cancelled: true };

type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export function browserSttSupported() {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function micSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

export class Listener {
  private stopFn: (() => void) | null = null;
  private cancelled = false;
  onLevel: (level: number) => void = () => {};
  onInterim: (text: string) => void = () => {};

  constructor(private cfg: () => VoiceConfig | null) {}

  get active() { return this.stopFn !== null; }

  /** Stop recording now and process what was said. */
  stop() { this.stopFn?.(); }
  /** Abort without processing. */
  cancel() { this.cancelled = true; this.stopFn?.(); }

  async listen(): Promise<ListenResult> {
    this.cancelled = false;
    const c = this.cfg();
    if (c?.stt.provider === "openai" && micSupported()) return this.recordAndTranscribe();
    if (browserSttSupported()) return this.browserRecognize();
    if (micSupported()) return { error: "Keine Spracherkennung verfügbar: Browser unterstützt keine Web-Spracherkennung und es ist kein OPENAI_API_KEY für die Server-Spracherkennung gesetzt." };
    return { error: "Mikrofon wird von diesem Browser nicht unterstützt." };
  }

  private async recordAndTranscribe(): Promise<ListenResult> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      return { error: (e as Error).name === "NotAllowedError" ? "Mikrofonzugriff verweigert. Erlaube das Mikrofon in den Browser-Einstellungen." : `Mikrofon nicht verfügbar: ${(e as Error).message}` };
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Voice activity detection on the RMS level.
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const started = performance.now();
    let heardAt = 0, lastLoud = 0, noise = 0.01, raf = 0;

    const finished = new Promise<void>((resolve) => {
      const end = () => {
        if (!this.stopFn) return;
        this.stopFn = null;
        cancelAnimationFrame(raf);
        if (rec.state !== "inactive") rec.stop(); else resolve();
      };
      rec.onstop = () => resolve();
      this.stopFn = end;
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (now - started < 400) noise = Math.max(noise, rms * 1.4); // calibrate on the first 400 ms
        const threshold = Math.max(0.018, noise * 1.8);
        this.onLevel(Math.min(1, rms / (threshold * 4)));
        if (rms > threshold) { lastLoud = now; if (!heardAt) heardAt = now; }
        if (heardAt && now - lastLoud > 1300 && now - heardAt > 400) return end(); // silence after speech
        if (!heardAt && now - started > 8000) { this.cancelled = true; return end(); } // nobody spoke
        if (now - started > 60000) return end(); // hard cap
        raf = requestAnimationFrame(tick);
      };
      rec.start(250);
      raf = requestAnimationFrame(tick);
    });
    await finished;
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    this.onLevel(0);
    if (this.cancelled) return { cancelled: true };
    const blob = new Blob(chunks, { type: (rec.mimeType || mime || "audio/webm").split(";")[0] });
    const form = new FormData();
    form.append("audio", blob, "aufnahme");
    try {
      const r = await fetch("/api/voice/stt", { method: "POST", body: form });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { error: data.error ?? `Spracherkennung fehlgeschlagen (${r.status})` };
      return data.text ? { text: data.text } : { cancelled: true };
    } catch (e) {
      return { error: `Spracherkennung nicht erreichbar: ${(e as Error).message}` };
    }
  }

  private browserRecognize(): Promise<ListenResult> {
    return new Promise((resolve) => {
      const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
      const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition)!;
      const rec = new Ctor();
      rec.lang = langTag(this.cfg()?.settings.language ?? "de");
      rec.interimResults = true;
      rec.continuous = false;
      let final = "", error: string | null = null;
      rec.onresult = (e) => {
        let fin = "", int = "";
        for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else int += r[0].transcript; }
        final = fin;
        this.onInterim(fin + int);
        this.onLevel(0.6);
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed") error = "Mikrofonzugriff verweigert.";
        else if (e.error !== "aborted" && e.error !== "no-speech") error = `Spracherkennung: ${e.error}`;
      };
      rec.onend = () => {
        this.stopFn = null;
        this.onLevel(0);
        if (this.cancelled) return resolve({ cancelled: true });
        if (error) return resolve({ error });
        resolve(final.trim() ? { text: final.trim() } : { cancelled: true });
      };
      this.stopFn = () => rec.stop();
      try { rec.start(); } catch (e) { this.stopFn = null; resolve({ error: (e as Error).message }); }
    });
  }
}
