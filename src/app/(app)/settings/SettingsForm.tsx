"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { apiFetch } from "@/lib/client/api";
import { Speaker, loadVoiceConfig, type VoiceConfig } from "@/lib/client/voiceEngine";

type S = {
  language: string; memoryMode: string; aiProvider: string; anthropicModel: string; openaiModel: string; effort: string;
  quietHoursStart: string; quietHoursEnd: string; aiContextFinance: boolean; aiContextHealth: boolean;
  voiceTts: string; voiceStt: string; voiceName: string; voiceSpeed: number; voiceAutoSpeak: boolean;
};
type Avail = { id: string; label: string; configured: boolean; voices: { id: string; label: string }[] }[];

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [avail, setAvail] = useState<Avail>([]);
  const [voiceInfo, setVoiceInfo] = useState<string | null>(null);
  const cfg = useRef<VoiceConfig | null>(null);
  const speaker = useRef<Speaker | null>(null);
  useEffect(() => {
    speaker.current = new Speaker(() => cfg.current);
    speaker.current.onError = (m) => setVoiceInfo(m);
    apiFetch<{ available: Avail }>("/api/voice/config").then((r) => setAvail(r.available)).catch(() => {});
    return () => speaker.current?.stop();
  }, []);
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });
  async function save() {
    // Only send the keys this form owns (balances etc. are edited elsewhere and must not be overwritten).
    const keys: (keyof S)[] = ["language", "memoryMode", "aiProvider", "anthropicModel", "openaiModel", "effort", "quietHoursStart", "quietHoursEnd",
      "aiContextFinance", "aiContextHealth", "voiceTts", "voiceStt", "voiceName", "voiceSpeed", "voiceAutoSpeak"];
    try { await apiFetch("/api/settings", { method: "PATCH", body: Object.fromEntries(keys.map((k) => [k, s[k]])) }); setMsg("Gespeichert."); return true; }
    catch (e) { setMsg((e as Error).message); return false; }
  }
  async function testVoice() {
    setVoiceInfo(null);
    speaker.current?.unlock();
    if (!(await save())) return;
    cfg.current = await loadVoiceConfig();
    setVoiceInfo(`Aktiv: ${cfg.current.tts.label}`);
    speaker.current?.stop();
    speaker.current?.enqueue(s.language === "en" ? "Good evening, Kewin. All systems are online." : "Guten Abend, Kewin. Alle Systeme sind bereit. Womit fangen wir an?");
  }
  const sel = (k: keyof S, label: string, opts: [string, string][], hint?: string) => (
    <label className="block text-sm"><span className="text-muted">{label}</span>
      <select className="input mt-1" value={String(s[k])} onChange={(e) => set(k, e.target.value as never)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
  const toggle = (k: "aiContextFinance" | "aiContextHealth" | "voiceAutoSpeak", label: string, hint: string) => (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1" checked={s[k]} onChange={(e) => set(k, e.target.checked)} />
      <span><span>{label}</span><span className="block text-xs text-muted">{hint}</span></span>
    </label>
  );
  const openai = avail.find((a) => a.id === "openai");
  const eleven = avail.find((a) => a.id === "elevenlabs");
  return (
    <section className="card space-y-4 p-5">
      <div className="label">KI-Kern</div>
      {sel("aiProvider", "Bevorzugter Anbieter", [["anthropic", "Anthropic Claude"], ["openai", "OpenAI"]], "Fällt automatisch auf den anderen zurück, wenn nur dieser konfiguriert ist.")}
      <label className="block text-sm"><span className="text-muted">Claude-Modell</span><input className="input mt-1" value={s.anthropicModel} onChange={(e) => set("anthropicModel", e.target.value)} /></label>
      <label className="block text-sm"><span className="text-muted">OpenAI-Modell</span><input className="input mt-1" value={s.openaiModel} onChange={(e) => set("openaiModel", e.target.value)} /></label>
      {sel("effort", "Denktiefe (Claude effort)", [["low", "Niedrig – schnell"], ["medium", "Mittel – Standard"], ["high", "Hoch – gründlich"]])}

      <div className="label pt-2">Stimme</div>
      {sel("voiceTts", "Sprachausgabe", [
        ["auto", "Automatisch (beste verfügbare)"],
        ["elevenlabs", `ElevenLabs${eleven?.configured ? "" : " – nicht konfiguriert"}`],
        ["openai", `OpenAI gpt-4o-mini-tts${openai?.configured ? "" : " – nicht konfiguriert"}`],
        ["browser", "Browser-Stimme (lokal, kostenlos)"],
      ], "Server-Stimmen brauchen ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID oder OPENAI_API_KEY in .env.local. Nicht konfigurierte Auswahl fällt auf die Browser-Stimme zurück.")}
      {(s.voiceTts === "openai" || (s.voiceTts === "auto" && openai?.configured && !eleven?.configured)) && openai && (
        sel("voiceName", "OpenAI-Stimme", openai.voices.map((v) => [v.id, v.label] as [string, string]))
      )}
      <label className="block text-sm"><span className="text-muted">Sprechtempo: {s.voiceSpeed.toFixed(2)}×</span>
        <input type="range" min={0.8} max={1.3} step={0.05} className="mt-2 w-full accent-[#258BFF]" value={s.voiceSpeed} onChange={(e) => set("voiceSpeed", Number(e.target.value))} aria-label="Sprechtempo" />
      </label>
      {sel("voiceStt", "Spracherkennung", [["auto", "Automatisch"], ["openai", `OpenAI gpt-4o-transcribe${openai?.configured ? "" : " – nicht konfiguriert"}`], ["browser", "Browser-Spracherkennung"]],
        "Server-Erkennung versteht Deutsch, Fachbegriffe und Namen (NGCX, HWR) deutlich besser und funktioniert in jedem Browser.")}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-ghost" onClick={testVoice}><Volume2 size={15} /> Stimme testen</button>
        {voiceInfo && <span className="text-xs text-muted">{voiceInfo}</span>}
      </div>

      <div className="label pt-2">Gedächtnis</div>
      {sel("memoryMode", "Automatisches Merken", [["suggest", "Vorschlagen – Freigabe im Memory Center"], ["auto", "Automatisch bei hoher Konfidenz"], ["off", "Aus"]],
        "Korrekturen bestehender Einträge werden nie still überschrieben, sondern als „unsicher“ markiert.")}

      <div className="label pt-2">Datenschutz – was an KI und Server-Stimme geht</div>
      {toggle("aiContextFinance", "Finanzübersicht für JARVIS freigeben", "Verfügbarer Betrag, Fixkosten, Budgetwarnungen – nur im persönlichen Workspace, nie in Business-Chats.")}
      {toggle("aiContextHealth", "Trainingsdaten für JARVIS freigeben", "Anzahl Trainings pro Woche. Körperwerte werden nie gesendet.")}

      <div className="label pt-2">Kommunikation</div>
      {sel("language", "Sprache", [["de", "Deutsch"], ["en", "English"]])}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm"><span className="text-muted">Ruhezeit ab</span><input type="time" className="input mt-1" value={s.quietHoursStart} onChange={(e) => set("quietHoursStart", e.target.value)} /></label>
        <label className="block text-sm"><span className="text-muted">bis</span><input type="time" className="input mt-1" value={s.quietHoursEnd} onChange={(e) => set("quietHoursEnd", e.target.value)} /></label>
      </div>
      <p className="text-xs text-muted">Ruhezeiten werden ab Phase 8 (proaktive Benachrichtigungen) angewendet.</p>
      <button className="btn btn-primary" onClick={save}>Speichern</button>
      {msg && <div className="text-sm text-muted">{msg}</div>}
    </section>
  );
}
