"use client";
import { useCallback, useEffect, useState } from "react";
import { Dumbbell, Ruler, Trash2 } from "lucide-react";
import { apiFetch, fmtDate } from "@/lib/client/api";
import { berlinDay } from "@/lib/time";

type Workout = { id: string; day: string; type: string; duration_min: number | null; intensity: number | null; notes: string };
type Latest = { metric: string; day: string; value: number; ageDays: number; stale: boolean };
type Data = { workouts: Workout[]; weeks: { week: string; count: number; minutes: number }[]; thisWeek: { count: number; minutes: number };
  latest: Latest[]; series: { metric: string; day: string; value: number }[]; metrics: Record<string, { label: string; unit: string }>; types: string[] };

export function FitnessClient() {
  const [d, setD] = useState<Data | null>(null);
  const [w, setW] = useState({ day: berlinDay(), type: "Krafttraining", durationMin: "60", intensity: "3", notes: "" });
  const [m, setM] = useState({ day: berlinDay(), metric: "weight_kg", value: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<Data>("/api/fitness").then(setD).catch((e) => setMsg(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function addWorkout() {
    try {
      await apiFetch("/api/fitness", { body: { kind: "workout", day: w.day, type: w.type, durationMin: w.durationMin ? Number(w.durationMin) : null, intensity: Number(w.intensity), notes: w.notes } });
      setW({ ...w, notes: "" }); setMsg("Training gespeichert."); load();
    } catch (e) { setMsg((e as Error).message); }
  }
  async function addMeasure() {
    try {
      await apiFetch("/api/fitness", { body: { kind: "measurement", day: m.day, metric: m.metric, value: Number(m.value.replace(",", ".")) } });
      setM({ ...m, value: "" }); setMsg("Messwert gespeichert."); load();
    } catch (e) { setMsg((e as Error).message); }
  }
  async function del(id: string) { if (confirm("Training löschen?")) { await apiFetch(`/api/fitness/${id}`, { method: "DELETE" }); load(); } }
  if (!d) return <p className="text-muted">Lade…</p>;
  const maxW = Math.max(1, ...d.weeks.map((x) => x.count));
  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2"><Dumbbell size={18} className="text-cyan" /><h2 className="font-medium">Training eintragen</h2></div>
          <div className="grid gap-2 sm:grid-cols-4">
            <input className="input" type="date" value={w.day} onChange={(e) => setW({ ...w, day: e.target.value })} aria-label="Datum" />
            <select className="input" value={w.type} onChange={(e) => setW({ ...w, type: e.target.value })} aria-label="Art">{d.types.map((t) => <option key={t}>{t}</option>)}</select>
            <input className="input" type="number" placeholder="Minuten" value={w.durationMin} onChange={(e) => setW({ ...w, durationMin: e.target.value })} aria-label="Dauer" />
            <select className="input" value={w.intensity} onChange={(e) => setW({ ...w, intensity: e.target.value })} aria-label="Intensität">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Intensität {n}/5</option>)}</select>
          </div>
          <input className="input mt-2" placeholder="Notizen (Übungen, Gewichte, Gefühl)" value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} aria-label="Notizen" />
          <button className="btn btn-primary mt-2" onClick={addWorkout}>Speichern</button>
        </section>
        <section className="card p-5">
          <div className="label">Diese Woche</div>
          <div className="mt-1 text-2xl font-semibold">{d.thisWeek.count} Trainings</div>
          <div className="text-xs text-muted">{d.thisWeek.minutes} Minuten</div>
          <div className="mt-4 flex h-20 items-end gap-1.5">{d.weeks.map((x) => (
            <div key={x.week} className="flex-1 rounded-t bg-gradient-to-t from-blue/40 to-cyan/80" style={{ height: `${Math.max(4, (x.count / maxW) * 100)}%`, opacity: x.count ? 1 : 0.25 }} title={`KW ab ${x.week}: ${x.count}`} />))}</div>
          <div className="mt-1 text-[10px] text-muted">letzte 8 Wochen</div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2"><Ruler size={18} className="text-cyan" /><h2 className="font-medium">Körperwerte</h2></div>
          <ul className="mb-4 space-y-1.5 text-sm">
            {d.latest.length === 0 && <li className="text-muted">Noch keine Messwerte.</li>}
            {d.latest.map((l) => (
              <li key={l.metric} className="flex justify-between gap-2">
                <span>{d.metrics[l.metric]?.label ?? l.metric}</span>
                <span>{l.value} {d.metrics[l.metric]?.unit} <span className={`text-xs ${l.stale ? "text-warn" : "text-muted"}`}>· Stand {fmtDate(l.day)}{l.stale ? " – evtl. veraltet" : ""}</span></span>
              </li>))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="input" type="date" value={m.day} onChange={(e) => setM({ ...m, day: e.target.value })} aria-label="Messdatum" />
            <select className="input" value={m.metric} onChange={(e) => setM({ ...m, metric: e.target.value })} aria-label="Messgröße">
              {Object.entries(d.metrics).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.unit})</option>)}</select>
            <input className="input" inputMode="decimal" placeholder="Wert" value={m.value} onChange={(e) => setM({ ...m, value: e.target.value })} aria-label="Wert" />
          </div>
          <button className="btn btn-primary mt-2" disabled={!m.value} onClick={addMeasure}>Messwert speichern</button>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-medium">Letzte Trainings</h2>
          <ul className="divide-y divide-ink-600/30 text-sm">
            {d.workouts.length === 0 && <li className="text-muted">Noch keine Trainings.</li>}
            {d.workouts.slice(0, 15).map((x) => (
              <li key={x.id} className="flex items-center gap-2 py-2">
                <span className="w-20 text-xs text-muted">{fmtDate(x.day)}</span>
                <span className="min-w-0 flex-1 truncate">{x.type}{x.notes ? <span className="text-muted"> · {x.notes}</span> : null}</span>
                <span className="text-xs text-muted">{x.duration_min ? `${x.duration_min} Min.` : ""}{x.intensity ? ` · ${x.intensity}/5` : ""}</span>
                <button onClick={() => del(x.id)} className="rounded p-1 text-muted hover:text-err" aria-label="Löschen"><Trash2 size={13} /></button>
              </li>))}
          </ul>
        </section>
      </div>
    </div>
  );
}
