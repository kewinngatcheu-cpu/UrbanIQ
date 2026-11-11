"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Circle, Clock, Plus, Trash2, RotateCcw, Play } from "lucide-react";
import { apiFetch, fmtDate, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/client/api";

type Ws = { id: string; name: string; color: string };
type Task = { id: string; workspace_id: string; title: string; notes: string; priority: string; status: string; due_at: string | null;
  postponed_count: number; project: string | null; completed_at: string | null };

export function TasksClient({ workspaces, fixedWorkspace }: { workspaces: Ws[]; fixedWorkspace?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterWs, setFilterWs] = useState(fixedWorkspace ?? "");
  const [view, setView] = useState<"open" | "done">("open");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [ws, setWs] = useState(fixedWorkspace ?? "personal");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ status: view });
    if (filterWs) q.set("workspace", filterWs);
    const r = await apiFetch<{ tasks: Task[] }>(`/api/tasks?${q}`);
    setTasks(r.tasks);
  }, [view, filterWs]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await apiFetch("/api/tasks", { body: { workspaceId: ws, title, priority, dueAt: due ? new Date(due).toISOString() : null } });
      setTitle(""); setDue(""); setError(null); load();
    } catch (err) { setError((err as Error).message); }
  }
  async function patch(id: string, body: Record<string, unknown>) {
    try { await apiFetch(`/api/tasks/${id}`, { method: "PATCH", body }); load(); } catch (err) { setError((err as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm("Aufgabe löschen?")) return;
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE" }); load();
  }
  const wsName = (id: string) => workspaces.find((w) => w.id === id);
  const now = Date.now();

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex flex-wrap items-center gap-2 p-3">
        <input className="input min-w-[200px] flex-1" placeholder="Neue Aufgabe…" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titel" />
        <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorität">
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input !w-auto" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fällig" />
        {!fixedWorkspace && (
          <select className="input !w-auto" value={ws} onChange={(e) => setWs(e.target.value)} aria-label="Workspace">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <button className="btn btn-primary" disabled={!title.trim()}><Plus size={15} /> Anlegen</button>
      </form>
      {error && <div className="text-sm text-err">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {(["open", "done"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`btn ${view === v ? "btn-primary" : "btn-ghost"} !py-1.5`}>{v === "open" ? "Offen" : "Erledigt"}</button>
        ))}
        {!fixedWorkspace && (
          <select className="input ml-auto !w-auto !py-1.5" value={filterWs} onChange={(e) => setFilterWs(e.target.value)} aria-label="Filter Workspace">
            <option value="">Alle Workspaces</option>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </div>

      <ul className="space-y-2">
        {tasks.length === 0 && <li className="card p-6 text-center text-sm text-muted">{view === "open" ? "Keine offenen Aufgaben." : "Noch nichts erledigt."}</li>}
        {tasks.map((t) => {
          const overdue = t.due_at && new Date(t.due_at).getTime() < now && t.status !== "done";
          const w = wsName(t.workspace_id);
          return (
            <li key={t.id} className="card p-3">
              <div className="flex items-start gap-3">
                <button aria-label={t.status === "done" ? "Wieder öffnen" : "Erledigt"} onClick={() => patch(t.id, { status: t.status === "done" ? "open" : "done" })}
                  className="mt-0.5 shrink-0 text-muted hover:text-ok">
                  {t.status === "done" ? <Check size={20} className="text-ok" /> : <Circle size={20} />}
                </button>
                <div className="min-w-0 flex-1">
                  <button onClick={() => setEditing(editing === t.id ? null : t.id)} className={`text-left text-[15px] ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</button>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span style={{ color: PRIORITY_COLOR[t.priority] }}>● {PRIORITY_LABEL[t.priority]}</span>
                    {t.status === "in_progress" && <span className="text-cyan">in Arbeit</span>}
                    {w && !fixedWorkspace && <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: w.color }} />{w.name}</span>}
                    {t.due_at && <span className={overdue ? "text-err" : ""}><Clock size={11} className="mr-0.5 inline" />{fmtDate(t.due_at, true)}</span>}
                    {t.postponed_count > 0 && <span className={t.postponed_count >= 3 ? "text-warn" : ""}>{t.postponed_count}× verschoben</span>}
                    {t.completed_at && <span>erledigt {fmtDate(t.completed_at)}</span>}
                  </div>
                  {editing === t.id && <TaskEditor task={t} onSave={(b) => { patch(t.id, b); setEditing(null); }} />}
                </div>
                <div className="flex shrink-0 gap-1">
                  {t.status === "open" && <button aria-label="Starten" title="In Arbeit" onClick={() => patch(t.id, { status: "in_progress" })} className="rounded p-1.5 text-muted hover:text-cyan"><Play size={14} /></button>}
                  {t.status === "done" && <button aria-label="Wieder öffnen" onClick={() => patch(t.id, { status: "open" })} className="rounded p-1.5 text-muted hover:text-cyan"><RotateCcw size={14} /></button>}
                  <button aria-label="Löschen" onClick={() => remove(t.id)} className="rounded p-1.5 text-muted hover:text-err"><Trash2 size={14} /></button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TaskEditor({ task, onSave }: { task: Task; onSave: (b: Record<string, unknown>) => void }) {
  const toLocal = (d: string | null) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [priority, setPriority] = useState(task.priority);
  const [due, setDue] = useState(toLocal(task.due_at));
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-ink-900/70 p-3">
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titel" />
      <textarea className="input" rows={3} placeholder="Notizen" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notizen" />
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorität">
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input !w-auto" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fällig" />
        <button className="btn btn-primary ml-auto" onClick={() => onSave({ title, notes, priority, dueAt: due ? new Date(due).toISOString() : null })}>Speichern</button>
      </div>
    </div>
  );
}
