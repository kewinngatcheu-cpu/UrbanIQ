"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

type P = { targetMarket?: string | null; productDirection?: string | null; phase?: string | null; principles?: string[]; businessModel?: string | null; objectives?: string | null };

export function ProfileEditor({ workspace }: { workspace: { id: string; name: string; description: string; profile: Record<string, unknown> } }) {
  const p = workspace.profile as P;
  const [desc, setDesc] = useState(workspace.description);
  const [f, setF] = useState({
    targetMarket: p.targetMarket ?? "", productDirection: p.productDirection ?? "", businessModel: p.businessModel ?? "",
    phase: p.phase ?? "", objectives: p.objectives ?? "", principles: (p.principles ?? []).join("\n"),
  });
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    try {
      await apiFetch(`/api/workspaces/${workspace.id}`, { method: "PATCH", body: {
        description: desc,
        profile: { ...workspace.profile, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === "principles" ? v.split("\n").map((s) => s.trim()).filter(Boolean) : v.trim() || null])) },
      } });
      setMsg("Gespeichert.");
    } catch (e) { setMsg((e as Error).message); }
  }
  const field = (k: keyof typeof f, label: string, rows = 1) => (
    <label className="block text-xs text-muted">{label}
      {rows > 1 ? <textarea className="input mt-1" rows={rows} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        : <input className="input mt-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </label>
  );
  return (
    <aside className="card h-fit space-y-3 p-5">
      <div className="label">Business-Profil</div>
      <label className="block text-xs text-muted">Beschreibung<textarea className="input mt-1" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
      {field("targetMarket", "Zielmarkt")}
      {field("productDirection", "Produktrichtung")}
      {field("businessModel", "Geschäftsmodell", 2)}
      {field("phase", "Aktuelle Phase")}
      {field("objectives", "Ziele", 3)}
      {field("principles", "Prinzipien (eine pro Zeile)", 5)}
      <button className="btn btn-primary" onClick={save}>Profil speichern</button>
      {msg && <div className="text-sm text-muted">{msg}</div>}
      <p className="text-xs text-muted">Das Profil fließt in jede JARVIS-Antwort dieses Workspaces ein.</p>
    </aside>
  );
}
