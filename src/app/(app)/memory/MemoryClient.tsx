"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, History, Pin, PinOff, Plus, Search, Trash2, X, Share2 } from "lucide-react";
import { apiFetch, ApiError, fmtDate, LAYER_LABEL, STATUS_LABEL } from "@/lib/client/api";

type Ws = { id: string; name: string; color: string };
type Memory = { id: string; workspace_id: string; layer: string; category: string; title: string; content: string; source: string;
  confidence: number; importance: number; pinned: boolean; status: string; review_at: string | null; shared_with: string[];
  version: number; created_at: string; updated_at: string; last_used_at: string | null; score?: number };
type Version = { version: number; title: string; content: string; status: string; changed_by: string; reason: string | null; created_at: string };

const STATUS_COLOR: Record<string, string> = { active: "#22C55E", proposed: "#37CFFF", uncertain: "#F59E0B", outdated: "#8D9AAF", archived: "#8D9AAF" };

export function MemoryClient({ workspaces, memoryMode }: { workspaces: Ws[]; memoryMode: string }) {
  const [items, setItems] = useState<Memory[]>([]);
  const [q, setQ] = useState("");
  const [ws, setWs] = useState("");
  const [layer, setLayer] = useState("");
  const [status, setStatus] = useState("");
  const [pinned, setPinned] = useState(false);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalCount, setProposalCount] = useState(0);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s) setStatus(s);
  }, []);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (ws) p.set("workspace", ws);
    if (layer) p.set("layer", layer);
    if (status) p.set("status", status);
    if (pinned) p.set("pinned", "true");
    const r = await apiFetch<{ memories: Memory[]; stats: { status: string; n: number }[] }>(`/api/memories?${p}`);
    setItems(r.memories);
    setProposalCount(r.stats.filter((s) => s.status === "proposed").reduce((a, s) => a + s.n, 0));
  }, [q, ws, layer, status, pinned]);
  useEffect(() => { const t = setTimeout(() => load().catch((e) => setError(e.message)), 200); return () => clearTimeout(t); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const r = await apiFetch<{ memory: Memory }>(`/api/memories/${id}`, { method: "PATCH", body });
      if (selected?.id === id) setSelected(r.memory);
      load();
    } catch (e) { setError((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm("Diese Erinnerung endgültig löschen? Der Versionsverlauf wird ebenfalls gelöscht.")) return;
    await apiFetch(`/api/memories/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    load();
  }
  const wsOf = (id: string) => workspaces.find((w) => w.id === id);

  return (
    <div className="space-y-4">
      {proposalCount > 0 && status !== "proposed" && (
        <button onClick={() => setStatus("proposed")} className="card card-hover flex w-full items-center justify-between p-3 text-left text-sm">
          <span><span className="text-cyan">{proposalCount} Vorschläge</span> aus Gesprächen warten auf deine Freigabe.</span><span className="text-muted">Prüfen →</span>
        </button>
      )}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Semantische Suche…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Suche" />
        </div>
        <select className="input !w-auto" value={ws} onChange={(e) => setWs(e.target.value)} aria-label="Workspace">
          <option value="">Alle Workspaces</option>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="input !w-auto" value={layer} onChange={(e) => setLayer(e.target.value)} aria-label="Ebene">
          <option value="">Alle Ebenen</option>{Object.entries(LAYER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Status: alle außer archiviert</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="all">Alle inkl. archiviert</option>
        </select>
        <button className={`btn ${pinned ? "btn-primary" : "btn-ghost"}`} onClick={() => setPinned(!pinned)}><Pin size={14} /> Angeheftet</button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} /> Neu</button>
      </div>
      <div className="text-xs text-muted">Automatisches Speichern: <b className="text-fg">{memoryMode === "off" ? "aus" : memoryMode === "suggest" ? "nur Vorschläge (Freigabe nötig)" : "automatisch bei hoher Konfidenz"}</b> – änderbar unter Settings.</div>
      {error && <div className="text-sm text-err">{error}</div>}
      {creating && <CreateForm workspaces={workspaces} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <ul className="space-y-2">
          {items.length === 0 && <li className="card p-6 text-center text-sm text-muted">Keine Einträge gefunden.</li>}
          {items.map((m) => {
            const w = wsOf(m.workspace_id);
            return (
              <li key={m.id} className={`card card-hover cursor-pointer p-4 ${selected?.id === m.id ? "!border-electric/60" : ""}`} onClick={() => setSelected(m)}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {m.pinned && <Pin size={13} className="shrink-0 text-cyan" />}
                      <span className={`truncate font-medium ${m.status === "outdated" ? "text-muted line-through" : ""}`}>{m.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{m.content}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="chip" style={{ color: STATUS_COLOR[m.status] }}>{STATUS_LABEL[m.status]}</span>
                      <span className="chip"><span className="h-1.5 w-1.5 rounded-full" style={{ background: w?.color }} />{w?.name ?? m.workspace_id}</span>
                      <span className="chip">{LAYER_LABEL[m.layer]} · {m.category}</span>
                      <span className="chip">Wichtigkeit {m.importance}/5</span>
                      {m.confidence < 1 && <span className="chip">Konfidenz {Math.round(m.confidence * 100)}%</span>}
                      {m.shared_with.length > 0 && <span className="chip"><Share2 size={10} /> geteilt: {m.shared_with.join(", ")}</span>}
                      {m.review_at && new Date(m.review_at) < new Date() && <span className="chip !text-warn">Überprüfung fällig</span>}
                      {m.score !== undefined && <span className="chip">Treffer {(m.score * 100).toFixed(0)}</span>}
                    </div>
                  </div>
                  {m.status === "proposed" && (
                    <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-primary !px-2.5 !py-1.5" onClick={() => patch(m.id, { status: "active", reason: "vom Eigentümer freigegeben" })} aria-label="Freigeben"><Check size={14} /></button>
                      <button className="btn btn-danger !px-2.5 !py-1.5" onClick={() => remove(m.id)} aria-label="Verwerfen"><X size={14} /></button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {selected && <Detail key={selected.id + selected.version} memory={selected} workspaces={workspaces} onPatch={patch} onDelete={remove} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function Detail({ memory, workspaces, onPatch, onDelete, onClose }: { memory: Memory; workspaces: Ws[];
  onPatch: (id: string, b: Record<string, unknown>) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [importance, setImportance] = useState(memory.importance);
  const [status, setStatus] = useState(memory.status);
  const [reason, setReason] = useState("");
  const [shared, setShared] = useState<string[]>(memory.shared_with);
  const [history, setHistory] = useState<Version[] | null>(null);
  const dirty = title !== memory.title || content !== memory.content || importance !== memory.importance || status !== memory.status || shared.join() !== memory.shared_with.join();

  async function loadHistory() {
    const r = await apiFetch<{ history: Version[] }>(`/api/memories/${memory.id}`);
    setHistory(r.history);
  }
  return (
    <aside className="card sticky top-6 h-fit space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="label">Eintrag · v{memory.version}</div>
        <button onClick={onClose} aria-label="Schließen" className="rounded p-1 text-muted hover:text-fg"><X size={16} /></button>
      </div>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titel" />
      <textarea className="input" rows={6} value={content} onChange={(e) => setContent(e.target.value)} aria-label="Inhalt" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Status
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="text-xs text-muted">Wichtigkeit
          <select className="input mt-1" value={importance} onChange={(e) => setImportance(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
      </div>
      {memory.layer !== "identity" && (
        <div className="text-xs text-muted">
          <div className="mb-1">Explizit teilen mit (sonst nur im eigenen Workspace sichtbar):</div>
          <div className="flex flex-wrap gap-2">
            {workspaces.filter((w) => w.id !== memory.workspace_id).map((w) => (
              <label key={w.id} className="chip cursor-pointer">
                <input type="checkbox" checked={shared.includes(w.id)} onChange={(e) => setShared(e.target.checked ? [...shared, w.id] : shared.filter((x) => x !== w.id))} /> {w.name}
              </label>
            ))}
          </div>
        </div>
      )}
      {dirty && <input className="input" placeholder="Grund der Änderung (optional, für Verlauf)" value={reason} onChange={(e) => setReason(e.target.value)} />}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={!dirty} onClick={() => onPatch(memory.id, { title, content, importance, status, sharedWith: shared, reason: reason || undefined })}>Speichern</button>
        <button className="btn btn-ghost" onClick={() => onPatch(memory.id, { pinned: !memory.pinned })}>{memory.pinned ? <><PinOff size={14} /> Lösen</> : <><Pin size={14} /> Anheften</>}</button>
        <button className="btn btn-ghost" onClick={loadHistory}><History size={14} /> Verlauf</button>
        <button className="btn btn-danger ml-auto" onClick={() => onDelete(memory.id)}><Trash2 size={14} /></button>
      </div>
      <div className="space-y-0.5 text-xs text-muted">
        <div>Quelle: {memory.source} · erstellt {fmtDate(memory.created_at, true)}</div>
        <div>Aktualisiert {fmtDate(memory.updated_at, true)} · zuletzt genutzt {fmtDate(memory.last_used_at, true)}</div>
        {memory.review_at && <div>Überprüfen ab {fmtDate(memory.review_at)}</div>}
      </div>
      {history && (
        <ol className="space-y-2 border-t border-ink-600/50 pt-3">
          {history.map((h) => (
            <li key={h.version} className="text-xs">
              <div className="text-muted">v{h.version} · {fmtDate(h.created_at, true)} · {h.changed_by} · {STATUS_LABEL[h.status]}{h.reason ? ` · „${h.reason}“` : ""}</div>
              <div className="mt-0.5"><b>{h.title}</b>: {h.content}</div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function CreateForm({ workspaces, onClose, onCreated }: { workspaces: Ws[]; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ workspaceId: "personal", layer: "personal", category: "general", title: "", content: "", importance: 3 });
  const [dup, setDup] = useState<Memory | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(allowDuplicate = false) {
    try {
      await apiFetch("/api/memories", { body: { ...f, allowDuplicate } });
      onCreated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setDup((e.body as { duplicate: Memory }).duplicate);
      else setError((e as Error).message);
    }
  }
  return (
    <div className="card space-y-2 p-4">
      <div className="flex items-center justify-between"><div className="font-medium">Neue Erinnerung</div><button onClick={onClose} aria-label="Schließen"><X size={16} /></button></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select className="input" value={f.workspaceId} onChange={(e) => setF({ ...f, workspaceId: e.target.value })} aria-label="Workspace">{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <select className="input" value={f.layer} onChange={(e) => setF({ ...f, layer: e.target.value })} aria-label="Ebene">{Object.entries(LAYER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="input" placeholder="Kategorie" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Kategorie" />
      </div>
      <input className="input" placeholder="Titel" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Titel" />
      <textarea className="input" rows={3} placeholder="Inhalt" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} aria-label="Inhalt" />
      {dup && (
        <div className="rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm">
          Sehr ähnlicher Eintrag existiert: <b>{dup.title}</b> – {dup.content}
          <div className="mt-2"><button className="btn btn-ghost !py-1" onClick={() => submit(true)}>Trotzdem anlegen</button></div>
        </div>
      )}
      {error && <div className="text-sm text-err">{error}</div>}
      <button className="btn btn-primary" disabled={!f.title || !f.content} onClick={() => submit()}>Speichern</button>
    </div>
  );
}
