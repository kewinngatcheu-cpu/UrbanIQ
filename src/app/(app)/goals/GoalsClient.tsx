"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Circle, Plus, Target, Trash2, X } from "lucide-react";
import { apiFetch, fmtDate } from "@/lib/client/api";

type Ws = { id: string; name: string; color: string };
type Milestone = { id: string; title: string; due_date: string | null; done_at: string | null };
type Goal = { id: string; workspace_id: string; title: string; description: string; category: string; horizon: string; target_date: string | null; status: string;
  metric_unit: string | null; metric_start: number | null; metric_target: number | null; metric_current: number | null;
  milestones: Milestone[]; open_tasks: number; done_tasks: number; progress: number | null };
type Alignment = { done: number; aligned: number; ratio: number | null };

const CAT: Record<string, string> = { personal: "Persönlich", business: "Business", finance: "Finanzen", fitness: "Fitness", learning: "Lernen", career: "Karriere" };
const HORIZON: Record<string, string> = { month: "Monat", quarter: "Quartal", year: "Jahr", long_term: "Langfristig" };
const STATUS: Record<string, string> = { active: "Aktiv", achieved: "Erreicht", paused: "Pausiert", dropped: "Verworfen" };

export function GoalsClient({ workspaces }: { workspaces: Ws[] }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [align, setAlign] = useState<Alignment | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<{ goals: Goal[]; alignment: Alignment }>("/api/goals").then((r) => { setGoals(r.goals); setAlign(r.alignment); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => { await apiFetch(`/api/goals/${id}`, { method: "PATCH", body }); load(); };
  const active = goals.filter((g) => g.status === "active");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><div className="label">Aktive Ziele</div><div className="mt-1 text-2xl font-semibold">{active.length}</div>
          {active.length > 5 && <div className="mt-1 text-xs text-warn">Mehr als 5 aktive Ziele verwässern den Fokus.</div>}</div>
        <div className="card p-4 sm:col-span-2"><div className="label">Ausrichtung (letzte 7 Tage)</div>
          {align && align.ratio != null ? (
            <>
              <div className="mt-1 text-2xl font-semibold">{Math.round(align.ratio * 100)} %</div>
              <div className="text-xs text-muted">{align.aligned} von {align.done} erledigten Aufgaben zahlen auf ein Ziel, das Studium oder eine Venture ein.
                {align.ratio < 0.4 && align.done >= 5 && <span className="text-warn"> Deine Woche ist von deinen Zielen entkoppelt.</span>}</div>
            </>
          ) : <div className="mt-1 text-sm text-muted">Noch keine erledigten Aufgaben in den letzten 7 Tagen.</div>}
        </div>
      </div>
      {err && <p className="text-sm text-err">{err}</p>}
      {creating ? <CreateGoal workspaces={workspaces} onDone={() => { setCreating(false); load(); }} /> :
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} /> Neues Ziel</button>}
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((g) => <GoalCard key={g.id} g={g} ws={workspaces.find((w) => w.id === g.workspace_id)} onPatch={patch} onChange={load} />)}
      </div>
      {goals.length === 0 && <p className="text-sm text-muted">Noch keine Ziele erfasst.</p>}
    </div>
  );
}

function GoalCard({ g, ws, onPatch, onChange }: { g: Goal; ws?: Ws; onPatch: (id: string, b: Record<string, unknown>) => void; onChange: () => void }) {
  const [ms, setMs] = useState("");
  const [current, setCurrent] = useState(g.metric_current?.toString() ?? "");
  const days = g.target_date ? Math.round((new Date(`${g.target_date}T12:00:00Z`).getTime() - Date.now()) / 864e5) : null;
  async function addMs() { if (!ms.trim()) return; await apiFetch(`/api/goals/${g.id}/milestones`, { body: { title: ms } }); setMs(""); onChange(); }
  async function toggleMs(m: Milestone) { await apiFetch(`/api/milestones/${m.id}`, { method: "PATCH", body: { done: !m.done_at } }); onChange(); }
  async function delMs(m: Milestone) { await apiFetch(`/api/milestones/${m.id}`, { method: "DELETE" }); onChange(); }
  async function del() { if (confirm(`Ziel „${g.title}“ löschen?`)) { await apiFetch(`/api/goals/${g.id}`, { method: "DELETE" }); onChange(); } }
  return (
    <div className={`card p-5 ${g.status !== "active" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <Target size={18} className="mt-0.5 shrink-0 text-cyan" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{g.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="chip">{CAT[g.category]}</span><span className="chip">{HORIZON[g.horizon]}</span>
            {ws && <span className="chip"><span className="h-1.5 w-1.5 rounded-full" style={{ background: ws.color }} />{ws.name}</span>}
            {g.target_date && <span className={`chip ${days != null && days < 14 && g.status === "active" ? "!text-warn" : ""}`}>bis {fmtDate(g.target_date)}{days != null && days >= 0 ? ` · ${days} T.` : ""}</span>}
          </div>
        </div>
        <select className="input !w-auto !py-1 text-xs" value={g.status} onChange={(e) => onPatch(g.id, { status: e.target.value })} aria-label="Status">
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={del} aria-label="Löschen" className="rounded p-1.5 text-muted hover:text-err"><Trash2 size={14} /></button>
      </div>
      {g.description && <p className="mt-2 text-sm text-muted">{g.description}</p>}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted"><span>Fortschritt</span><span>{g.progress == null ? "unbekannt" : `${Math.round(g.progress * 100)} %`}</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-900"><div className="h-full rounded-full bg-gradient-to-r from-blue to-cyan" style={{ width: `${Math.round((g.progress ?? 0) * 100)}%` }} /></div>
      </div>
      {g.metric_target != null && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted">Aktuell</span>
          <input className="input !w-28 !py-1" type="number" value={current} onChange={(e) => setCurrent(e.target.value)} aria-label="Aktueller Wert" />
          <span className="text-muted">/ {g.metric_target} {g.metric_unit}</span>
          {current !== (g.metric_current?.toString() ?? "") && <button className="btn btn-primary !py-1" onClick={() => onPatch(g.id, { metricCurrent: Number(current) })}>Speichern</button>}
        </div>
      )}
      <ul className="mt-3 space-y-1">
        {g.milestones.map((m) => (
          <li key={m.id} className="group flex items-center gap-2 text-sm">
            <button onClick={() => toggleMs(m)} aria-label="Meilenstein umschalten">{m.done_at ? <Check size={16} className="text-ok" /> : <Circle size={16} className="text-muted" />}</button>
            <span className={`flex-1 ${m.done_at ? "text-muted line-through" : ""}`}>{m.title}</span>
            {m.due_date && <span className="text-xs text-muted">{fmtDate(m.due_date)}</span>}
            <button onClick={() => delMs(m)} className="hidden text-muted hover:text-err group-hover:block" aria-label="Meilenstein löschen"><X size={13} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input className="input !py-1 text-sm" placeholder="Meilenstein hinzufügen" value={ms} onChange={(e) => setMs(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMs()} aria-label="Meilenstein" />
      </div>
      <div className="mt-3 text-xs text-muted">Verknüpfte Aufgaben: {g.open_tasks} offen · {g.done_tasks} erledigt <a className="text-cyan" href={`/tasks?goal=${g.id}`}>→ Aufgaben</a></div>
    </div>
  );
}

function CreateGoal({ workspaces, onDone }: { workspaces: Ws[]; onDone: () => void }) {
  const [f, setF] = useState({ title: "", description: "", category: "personal", horizon: "quarter", workspaceId: "personal", targetDate: "", metricUnit: "", metricStart: "", metricTarget: "", milestones: "" });
  const [err, setErr] = useState<string | null>(null);
  const s = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  async function save() {
    try {
      const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
      await apiFetch("/api/goals", { body: {
        title: f.title, description: f.description, category: f.category, horizon: f.horizon, workspaceId: f.workspaceId, targetDate: f.targetDate || null,
        metricUnit: f.metricUnit || null, metricStart: num(f.metricStart), metricTarget: num(f.metricTarget),
        milestones: f.milestones.split("\n").map((x) => x.trim()).filter(Boolean).map((title) => ({ title })),
      } });
      onDone();
    } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="card space-y-2 p-5">
      <div className="flex justify-between"><div className="font-medium">Neues Ziel</div><button onClick={onDone} aria-label="Schließen"><X size={16} /></button></div>
      <input className="input" placeholder="Ziel (konkret und überprüfbar)" value={f.title} onChange={s("title")} aria-label="Titel" />
      <textarea className="input" rows={2} placeholder="Warum ist das wichtig?" value={f.description} onChange={s("description")} aria-label="Beschreibung" />
      <div className="grid gap-2 sm:grid-cols-4">
        <select className="input" value={f.category} onChange={s("category")} aria-label="Kategorie">{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={f.horizon} onChange={s("horizon")} aria-label="Horizont">{Object.entries(HORIZON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={f.workspaceId} onChange={s("workspaceId")} aria-label="Workspace">{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <input className="input" type="date" value={f.targetDate} onChange={s("targetDate")} aria-label="Zieldatum" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="input" placeholder="Einheit (z. B. €, kg, Kunden)" value={f.metricUnit} onChange={s("metricUnit")} aria-label="Einheit" />
        <input className="input" placeholder="Startwert" value={f.metricStart} onChange={s("metricStart")} aria-label="Startwert" />
        <input className="input" placeholder="Zielwert" value={f.metricTarget} onChange={s("metricTarget")} aria-label="Zielwert" />
      </div>
      <textarea className="input" rows={3} placeholder="Meilensteine (einer pro Zeile, optional)" value={f.milestones} onChange={s("milestones")} aria-label="Meilensteine" />
      {err && <p className="text-sm text-err">{err}</p>}
      <button className="btn btn-primary" disabled={!f.title.trim()} onClick={save}>Ziel anlegen</button>
    </div>
  );
}
