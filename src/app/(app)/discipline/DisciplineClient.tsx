"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Flame, Pause, Play, Plus, Timer, Trash2, Wrench } from "lucide-react";
import { apiFetch, fmtDate } from "@/lib/client/api";
import { addDays, berlinDay } from "@/lib/time";

type Habit = { id: string; title: string; target_per_week: number; days: string[]; streak: number; week_done: number; consistency30: number };
type Focus = { id: string; task_id: string | null; task_title: string | null; label: string; planned_min: number; started_at: string; actual_min: number | null; completed: boolean | null };
type FocusData = { active: Focus | null; stats: { today_min: number; week_min: number; sessions_week: number; completed_week: number; byWorkspace: { workspace_id: string | null; minutes: number }[] }; recent: Focus[]; serverNow: string };
type Cand = { id: string; title: string; postponed_count: number; due_at: string | null; blocker_reason: string | null };
type Proc = { candidates: Cand[]; patterns: { reason: string; n: number }[]; reasons: Record<string, { label: string; advice: string }> };

export function DisciplineClient({ tasks }: { tasks: { id: string; title: string; workspace_id: string }[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <div className="min-w-0 space-y-6"><Habits /><Procrastination /></div>
      <div className="min-w-0"><FocusTimer tasks={tasks} /></div>
    </div>
  );
}

function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(7);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<{ habits: Habit[] }>("/api/habits").then((r) => setHabits(r.habits)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const today = berlinDay();
  const days = [6, 5, 4, 3, 2, 1, 0].map((i) => addDays(today, -i));
  async function toggle(h: Habit, day: string) {
    try { await apiFetch(`/api/habits/${h.id}`, { body: { day, done: !h.days.includes(day) } }); load(); } catch (e) { setErr((e as Error).message); }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await apiFetch("/api/habits", { body: { title, targetPerWeek: target } });
    setTitle(""); load();
  }
  async function archive(h: Habit) {
    if (!confirm(`„${h.title}“ archivieren?`)) return;
    await apiFetch(`/api/habits/${h.id}`, { method: "DELETE" }); load();
  }
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2"><Flame size={18} className="text-cyan" /><h2 className="font-medium">Gewohnheiten</h2></div>
      {err && <p className="mb-2 text-sm text-err">{err}</p>}
      {habits.length === 0 ? <p className="mb-4 text-sm text-muted">Noch keine Gewohnheiten. Starte mit 2–3, nicht mit zehn.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted">
              <th className="pb-2 text-left font-normal">Gewohnheit</th>
              {days.map((d) => <th key={d} className="w-9 pb-2 font-normal">{new Date(`${d}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2)}</th>)}
              <th className="pb-2 pl-3 text-right font-normal">Serie</th><th className="pb-2 pl-3 text-right font-normal">30 T.</th><th />
            </tr></thead>
            <tbody>
              {habits.map((h) => (
                <tr key={h.id} className="border-t border-ink-600/30">
                  <td className="py-2 pr-2"><div className="max-w-[220px] truncate">{h.title}</div><div className="text-[11px] text-muted">{h.week_done}/{h.target_per_week} diese Woche</div></td>
                  {days.map((d) => {
                    const done = h.days.includes(d);
                    return (
                      <td key={d} className="text-center">
                        <button aria-label={`${h.title} ${d}`} onClick={() => toggle(h, d)}
                          className={`h-7 w-7 rounded-md border ${done ? "border-cyan/60 bg-cyan/25 text-cyan" : "border-ink-600 hover:border-electric"} ${d === today ? "ring-1 ring-electric/50" : ""}`}>
                          {done && <Check size={14} className="mx-auto" />}
                        </button>
                      </td>);
                  })}
                  <td className="pl-3 text-right tabular-nums">{h.streak}</td>
                  <td className={`pl-3 text-right tabular-nums ${h.consistency30 < 0.5 ? "text-warn" : ""}`}>{Math.round(h.consistency30 * 100)}%</td>
                  <td className="pl-2 text-right"><button aria-label="Archivieren" onClick={() => archive(h)} className="rounded p-1 text-muted hover:text-err"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2">
        <input className="input min-w-[180px] flex-1" placeholder="Neue Gewohnheit, z. B. 20 Min. lesen" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Neue Gewohnheit" />
        <select className="input !w-auto" value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Ziel pro Woche">
          {[7, 6, 5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}× / Woche</option>)}
        </select>
        <button className="btn btn-primary" disabled={!title.trim()}><Plus size={15} /> Anlegen</button>
      </form>
      <p className="mt-2 text-[11px] text-muted">Nur die letzten 7 Tage sind änderbar – rückwirkendes Schönen der Statistik ist nicht möglich.</p>
    </section>
  );
}

function FocusTimer({ tasks }: { tasks: { id: string; title: string }[] }) {
  const [d, setD] = useState<FocusData | null>(null);
  const [taskId, setTaskId] = useState("");
  const [label, setLabel] = useState("");
  const [planned, setPlanned] = useState(50);
  const [now, setNow] = useState(Date.now());
  const [skew, setSkew] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<FocusData>("/api/focus").then((r) => { setD(r); setSkew(Date.now() - new Date(r.serverNow).getTime()); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  async function start() {
    try { await apiFetch("/api/focus", { body: { taskId: taskId || null, label, plannedMin: planned } }); setErr(null); load(); } catch (e) { setErr((e as Error).message); }
  }
  async function stop(completed: boolean, taskDone = false) {
    if (!d?.active) return;
    await apiFetch(`/api/focus/${d.active.id}`, { method: "PATCH", body: { completed, taskDone } }); load();
  }
  const a = d?.active;
  const elapsed = a ? Math.max(0, Math.floor((now - skew - new Date(a.started_at).getTime()) / 1000)) : 0;
  const remaining = a ? a.planned_min * 60 - elapsed : 0;
  const mmss = (s: number) => `${s < 0 ? "+" : ""}${String(Math.floor(Math.abs(s) / 60)).padStart(2, "0")}:${String(Math.abs(s) % 60).padStart(2, "0")}`;
  const pct = a ? Math.min(1, elapsed / (a.planned_min * 60)) : 0;
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2"><Timer size={18} className="text-cyan" /><h2 className="font-medium">Fokus-Session</h2></div>
      {err && <p className="mb-2 text-sm text-err">{err}</p>}
      {a ? (
        <div className="text-center">
          <div className="relative mx-auto h-44 w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#22304A" strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={remaining < 0 ? "#22C55E" : "#37CFFF"} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${pct * 276.5} 276.5`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-3xl tabular-nums">{mmss(remaining)}</div>
              <div className="text-xs text-muted">{remaining < 0 ? "Zeit überschritten" : `von ${a.planned_min} Min.`}</div>
            </div>
          </div>
          <div className="mt-3 truncate text-sm">{a.task_title ?? a.label ?? "Freie Session"}</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" onClick={() => stop(true)}><Check size={15} /> Abschließen</button>
            {a.task_id && <button className="btn btn-ghost" onClick={() => stop(true, true)}>Abschließen + Aufgabe erledigt</button>}
            <button className="btn btn-ghost" onClick={() => stop(false)}><Pause size={15} /> Abbrechen</button>
          </div>
          <p className="mt-2 text-[11px] text-muted">Läuft serverseitig weiter – auf jedem Gerät sichtbar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <select className="input" value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Aufgabe">
            <option value="">Ohne Aufgabe</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {!taskId && <input className="input" placeholder="Worum geht es?" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Bezeichnung" />}
          <div className="flex flex-wrap gap-1.5">{[25, 50, 90].map((m) => (
            <button key={m} onClick={() => setPlanned(m)} className={`btn !px-3 !py-1 text-xs ${planned === m ? "btn-primary" : "btn-ghost"}`}>{m} Min.</button>))}</div>
          <button className="btn btn-primary w-full justify-center" onClick={start}><Play size={15} /> Fokus starten</button>
        </div>
      )}
      {d && (
        <div className="mt-5 border-t border-ink-600/40 pt-4 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-ink-900/70 py-2"><div className="text-lg font-semibold">{d.stats.today_min}</div><div className="text-[11px] text-muted">Min. heute</div></div>
            <div className="rounded-lg bg-ink-900/70 py-2"><div className="text-lg font-semibold">{d.stats.week_min}</div><div className="text-[11px] text-muted">Min. Woche</div></div>
            <div className="rounded-lg bg-ink-900/70 py-2"><div className="text-lg font-semibold">{d.stats.completed_week}/{d.stats.sessions_week}</div><div className="text-[11px] text-muted">abgeschlossen</div></div>
          </div>
          {d.stats.byWorkspace.length > 0 && <div className="mt-3 text-xs text-muted">Fokuszeit nach Bereich: {d.stats.byWorkspace.map((w) => `${w.workspace_id ?? "ohne"} ${w.minutes} Min.`).join(" · ")}</div>}
          <ul className="mt-3 space-y-1 text-xs text-muted">{d.recent.map((r) => (
            <li key={r.id} className="flex justify-between gap-2"><span className="truncate">{r.task_title ?? (r.label || "Freie Session")}</span>
              <span className="shrink-0">{r.actual_min} Min. · {r.completed ? "✓" : "abgebrochen"} · {fmtDate(r.started_at)}</span></li>))}</ul>
        </div>
      )}
    </section>
  );
}

function Procrastination() {
  const [d, setD] = useState<Proc | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("unclear");
  const [step, setStep] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<Proc>("/api/procrastination").then(setD).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  async function resolve(id: string) {
    const r = await apiFetch<{ advice: string; actions: string[] }>("/api/procrastination", { body: { taskId: id, reason, nextStep: step || undefined } });
    setResult(`${r.advice}${r.actions.includes("next_step_created") ? " ✓ Nächster Schritt als Aufgabe für morgen angelegt." : ""}${r.actions.includes("priority_lowered") ? " ✓ Priorität gesenkt." : ""}`);
    setOpen(null); setStep(""); load();
  }
  if (!d) return null;
  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2"><Wrench size={18} className="text-cyan" /><h2 className="font-medium">Aufgeschoben</h2></div>
      <p className="mb-4 text-sm text-muted">Aufgaben, deren Deadline mehrfach verschoben wurde oder die seit über 3 Tagen überfällig sind. Ursache benennen → strukturelle Lösung.</p>
      {result && <div className="mb-3 rounded-lg border border-electric/30 bg-blue/5 p-3 text-sm">{result}</div>}
      {d.candidates.length === 0 ? <p className="text-sm text-muted">Nichts aufgeschoben. Gut.</p> : (
        <ul className="space-y-2">
          {d.candidates.map((t) => (
            <li key={t.id} className="rounded-lg bg-ink-900/70 p-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><div className="truncate text-sm">{t.title}</div>
                  <div className="text-xs text-muted">{t.postponed_count}× verschoben{t.due_at ? ` · fällig ${fmtDate(t.due_at)}` : ""}{t.blocker_reason ? ` · Ursache: ${d.reasons[t.blocker_reason]?.label}` : ""}</div></div>
                <button className="btn btn-ghost !py-1 text-xs" onClick={() => setOpen(open === t.id ? null : t.id)}>Analysieren</button>
              </div>
              {open === t.id && (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-1.5 sm:grid-cols-2">{Object.entries(d.reasons).map(([k, r]) => (
                    <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${reason === k ? "border-electric bg-blue/10" : "border-ink-600"}`}>
                      <input type="radio" name={`r-${t.id}`} checked={reason === k} onChange={() => setReason(k)} /> {r.label}</label>))}</div>
                  <p className="text-xs text-muted">{d.reasons[reason]?.advice}</p>
                  <input className="input" placeholder="Kleinster nächster Schritt (optional → wird als 25-Min.-Aufgabe für morgen angelegt)" value={step} onChange={(e) => setStep(e.target.value)} />
                  <button className="btn btn-primary" onClick={() => resolve(t.id)}>Übernehmen</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {d.patterns.length > 0 && <p className="mt-4 text-xs text-muted">Deine häufigsten Ursachen: {d.patterns.map((p) => `${d.reasons[p.reason]?.label ?? p.reason} (${p.n})`).join(" · ")}</p>}
    </section>
  );
}
