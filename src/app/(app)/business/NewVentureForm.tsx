"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/client/api";

export function NewVentureForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  async function create() {
    try {
      await apiFetch("/api/workspaces", { body: { id: slug, name, description: desc, kind: "business", profile: { phase: "Idee" } } });
      window.location.href = `/business/${slug}`;
    } catch (e) { setError((e as Error).message); }
  }
  if (!open) return (
    <button onClick={() => setOpen(true)} className="card card-hover flex min-h-[200px] flex-col items-center justify-center gap-2 border-dashed p-5 text-muted hover:text-fg">
      <Plus size={22} /> Neue Venture anlegen
    </button>
  );
  return (
    <div className="card space-y-2 p-5">
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
      <textarea className="input" rows={3} placeholder="Kurzbeschreibung" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Beschreibung" />
      {slug && <div className="text-xs text-muted">ID: {slug}</div>}
      {error && <div className="text-sm text-err">{error}</div>}
      <div className="flex gap-2"><button className="btn btn-primary" disabled={slug.length < 2} onClick={create}>Anlegen</button><button className="btn btn-ghost" onClick={() => setOpen(false)}>Abbrechen</button></div>
    </div>
  );
}
