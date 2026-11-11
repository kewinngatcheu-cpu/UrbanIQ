"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

type S = { language: string; memoryMode: string; aiProvider: string; anthropicModel: string; openaiModel: string; effort: string; quietHoursStart: string; quietHoursEnd: string };

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof S, v: string) => setS({ ...s, [k]: v });
  async function save() {
    try { await apiFetch("/api/settings", { method: "PATCH", body: s }); setMsg("Gespeichert."); }
    catch (e) { setMsg((e as Error).message); }
  }
  const sel = (k: keyof S, label: string, opts: [string, string][], hint?: string) => (
    <label className="block text-sm"><span className="text-muted">{label}</span>
      <select className="input mt-1" value={s[k]} onChange={(e) => set(k, e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
  return (
    <section className="card space-y-4 p-5">
      <div className="label">KI-Kern</div>
      {sel("aiProvider", "Bevorzugter Anbieter", [["anthropic", "Anthropic Claude"], ["openai", "OpenAI"]], "Fällt automatisch auf den anderen zurück, wenn nur dieser konfiguriert ist.")}
      <label className="block text-sm"><span className="text-muted">Claude-Modell</span><input className="input mt-1" value={s.anthropicModel} onChange={(e) => set("anthropicModel", e.target.value)} /></label>
      <label className="block text-sm"><span className="text-muted">OpenAI-Modell</span><input className="input mt-1" value={s.openaiModel} onChange={(e) => set("openaiModel", e.target.value)} /></label>
      {sel("effort", "Denktiefe (Claude effort)", [["low", "Niedrig – schnell"], ["medium", "Mittel – Standard"], ["high", "Hoch – gründlich"]])}
      <div className="label pt-2">Gedächtnis</div>
      {sel("memoryMode", "Automatisches Merken", [["suggest", "Vorschlagen – Freigabe im Memory Center"], ["auto", "Automatisch bei hoher Konfidenz"], ["off", "Aus"]],
        "Korrekturen bestehender Einträge werden nie still überschrieben, sondern als „unsicher“ markiert.")}
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
