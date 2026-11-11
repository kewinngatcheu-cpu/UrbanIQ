"use client";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Plus, Trash2, X } from "lucide-react";
import { apiFetch, fmtDate } from "@/lib/client/api";
import { TasksClient } from "@/components/TasksClient";

type Ws = { id: string; name: string; color: string };
type Course = { id: string; name: string; semester: string | null; ects: number | null; exam_date: string | null; status: string; grade: number | null; notes: string; open_tasks: number; next_due: string | null };
const STATUS: Record<string, string> = { active: "Laufend", passed: "Bestanden", failed: "Nicht bestanden", dropped: "Abgebrochen" };

export function UniversityClient({ workspaces }: { workspaces: Ws[] }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [grade, setGrade] = useState<{ average: number | null; ects: number }>({ average: null, ects: 0 });
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", semester: "", ects: "", examDate: "" });
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<{ courses: Course[]; grade: typeof grade }>("/api/courses").then((r) => { setCourses(r.courses); setGrade(r.grade); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function add() {
    try {
      await apiFetch("/api/courses", { body: { name: f.name, semester: f.semester || null, ects: f.ects ? Number(f.ects) : null, examDate: f.examDate || null } });
      setF({ name: "", semester: f.semester, ects: "", examDate: "" }); load();
    } catch (e) { setErr((e as Error).message); }
  }
  async function patch(id: string, body: Record<string, unknown>) { try { await apiFetch(`/api/courses/${id}`, { method: "PATCH", body }); load(); } catch (e) { setErr((e as Error).message); } }
  async function del(c: Course) { if (confirm(`Modul „${c.name}“ löschen? Verknüpfte Aufgaben bleiben erhalten.`)) { await apiFetch(`/api/courses/${c.id}`, { method: "DELETE" }); if (sel === c.id) setSel(null); load(); } }
  const days = (d: string) => Math.round((new Date(`${d}T12:00:00Z`).getTime() - Date.now()) / 864e5);
  const active = courses.filter((c) => c.status === "active");
  const selected = courses.find((c) => c.id === sel);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><div className="label">Laufende Module</div><div className="mt-1 text-2xl font-semibold">{active.length}</div></div>
        <div className="card p-4"><div className="label">Nächste Prüfung</div>
          {(() => { const n = active.filter((c) => c.exam_date && days(c.exam_date) >= 0).sort((a, b) => a.exam_date!.localeCompare(b.exam_date!))[0];
            return n ? <><div className="mt-1 text-lg font-semibold">{n.name}</div><div className={`text-xs ${days(n.exam_date!) <= 14 ? "text-warn" : "text-muted"}`}>{fmtDate(n.exam_date)} · in {days(n.exam_date!)} Tagen</div></> : <div className="mt-1 text-sm text-muted">Keine Termine erfasst.</div>; })()}
        </div>
        <div className="card p-4"><div className="label">Notenschnitt (ECTS-gewichtet)</div>
          <div className="mt-1 text-2xl font-semibold">{grade.average?.toFixed(2).replace(".", ",") ?? "–"}</div><div className="text-xs text-muted">{grade.ects} ECTS benotet</div></div>
      </div>
      {err && <p className="text-sm text-err">{err}</p>}
      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2"><GraduationCap size={18} className="text-cyan" /><h2 className="font-medium">Module</h2></div>
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_120px_90px_160px_auto]">
          <input className="input" placeholder="Modul, z. B. Finanzmathematik" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Modulname" />
          <input className="input" placeholder="Semester" value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })} aria-label="Semester" />
          <input className="input" type="number" placeholder="ECTS" value={f.ects} onChange={(e) => setF({ ...f, ects: e.target.value })} aria-label="ECTS" />
          <input className="input" type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} aria-label="Prüfungsdatum" />
          <button className="btn btn-primary" disabled={!f.name.trim()} onClick={add}><Plus size={15} /> Anlegen</button>
        </div>
        <ul className="space-y-2">
          {courses.length === 0 && <li className="text-sm text-muted">Noch keine Module.</li>}
          {courses.map((c) => (
            <li key={c.id} className={`rounded-lg p-3 ${sel === c.id ? "bg-blue/10 ring-1 ring-electric/40" : "bg-ink-900/70"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => setSel(sel === c.id ? null : c.id)}>
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{[c.semester, c.ects ? `${c.ects} ECTS` : null, c.exam_date ? `Prüfung ${fmtDate(c.exam_date)}${c.status === "active" && days(c.exam_date) >= 0 ? ` (in ${days(c.exam_date)} T.)` : ""}` : null,
                    `${c.open_tasks} offene Aufgaben`].filter(Boolean).join(" · ")}</div>
                </button>
                <select className="input !w-auto !py-1 text-xs" value={c.status} onChange={(e) => patch(c.id, { status: e.target.value })} aria-label="Status">
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                {c.status === "passed" && (
                  <input className="input !w-20 !py-1 text-xs" inputMode="decimal" placeholder="Note" defaultValue={c.grade?.toString().replace(".", ",") ?? ""} aria-label="Note"
                    onBlur={(e) => { const v = e.target.value.trim(); patch(c.id, { grade: v ? Number(v.replace(",", ".")) : null }); }} />
                )}
                <button className="rounded p-1.5 text-muted hover:text-err" onClick={() => del(c)} aria-label="Löschen"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {selected && (
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-medium">Lernaufgaben · {selected.name}</h2><button onClick={() => setSel(null)} aria-label="Schließen"><X size={16} /></button></div>
          <TasksClient key={selected.id} workspaces={workspaces} fixedWorkspace="personal" courseId={selected.id} />
        </section>
      )}
    </div>
  );
}
