"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Coffee, Play, Sparkles, Sunrise, Moon, Volume2 } from "lucide-react";
import { apiFetch, fmtDate, PRIORITY_COLOR, PRIORITY_LABEL } from "@/lib/client/api";
import { Markdown } from "@/components/Markdown";
import { fmtEUR } from "@/lib/time";

type TaskLite = { id: string; title: string; priority: string; due_at: string | null; workspace_id: string; postponed_count: number; estimate_min: number | null; score?: number };
type Briefing = {
  day: string;
  personal: { habitsDone: number; habitsTotal: number; focusMinToday: number; focusMinWeek: number; workoutsThisWeek: number; eveningReviewYesterday: boolean };
  schedule: { calendarConnected: boolean; dueToday: TaskLite[]; overdue: TaskLite[] };
  priorities: TaskLite[];
  ventures: { id: string; name: string; phase: string | null; openTasks: number; critical: number; lastKnowledgeUpdate: string | null }[];
  decisions: { uncertain: { id: string; title: string; workspace_id: string }[]; proposals: number };
  university: { exams: { name: string; exam_date: string; daysLeft: number; openTasks: number }[]; dueSoon: TaskLite[] };
  finance: null | { available: number; perDay: number; daysLeft: number; warnings: { category: string; ratio: number; state: string }[] };
  goals: { id: string; title: string; progress: number | null; daysLeft: number | null }[];
  risks: string[];
  nextActions: string[];
};
type Block = { start: string; end: string; minutes: number; kind: "task" | "break"; taskId: string | null; title: string; reason: string };
type Plan = { availableMin: number; startAt: string; blocks: Block[]; unplanned: number; warnings: string[]; method: "rules" | "ai" };
type Stats = { done: number; due_open: number; focus_min: number; doneTitles: string[]; habitsDone: number; habitsTotal: number };
type Evening = { accomplished?: string; notDone?: string; why?: string; learned?: string; improve?: string; energy?: number | null; focus?: number | null };
type Data = { today: string; briefing: Briefing; stats: Stats;
  stored: null | { briefing_ai: string | null; plan: Plan | null; evening: Evening | null; ai_feedback: string | null };
  reviews: { day: string; evening: Evening & { stats?: Stats }; ai_feedback: string | null }[] };

export function MyDayClient({ workspaces }: { workspaces: { id: string; name: string }[] }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => apiFetch<Data>("/api/myday").then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (error) return <div className="text-err">{error}</div>;
  if (!data) return <div className="text-muted">Lade Tagesdaten…</div>;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
      <div className="min-w-0 space-y-6">
        <BriefingCard b={data.briefing} aiText={data.stored?.briefing_ai ?? null} />
      </div>
      <div className="min-w-0 space-y-6">
        <Planner initial={data.stored?.plan ?? null} workspaces={workspaces} />
        <EveningReview stats={data.stats} initial={data.stored?.evening ?? null} feedback={data.stored?.ai_feedback ?? null} onSaved={load} />
        {data.reviews.length > 0 && (
          <section className="card p-5">
            <div className="label mb-3">Letzte Reviews</div>
            <ul className="space-y-3 text-sm">
              {data.reviews.map((r) => (
                <li key={r.day}>
                  <div className="flex justify-between text-xs text-muted"><span>{fmtDate(r.day)}</span>
                    <span>{r.evening.stats ? `${r.evening.stats.done} erledigt · ${r.evening.stats.focus_min} Min. Fokus` : ""}{r.evening.energy ? ` · Energie ${r.evening.energy}/5` : ""}</span></div>
                  {r.evening.learned && <div className="mt-0.5">Gelernt: {r.evening.learned}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function BriefingCard({ b, aiText: initialAi }: { b: Briefing; aiText: string | null }) {
  const [aiText, setAiText] = useState(initialAi);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function generate() {
    setBusy(true); setErr(null);
    try { setAiText((await apiFetch<{ text: string }>("/api/myday", { body: { action: "briefing_ai" } })).text); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  function speak() {
    if (!aiText || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(aiText.replace(/[*#`_]/g, ""));
    u.lang = "de-DE";
    window.speechSynthesis.speak(u);
  }
  const ws = (id: string) => b.ventures.find((v) => v.id === id)?.name ?? (id === "personal" ? "Persönlich" : id);
  const taskLine = (t: TaskLite) => (
    <li key={t.id} className="flex items-baseline gap-2">
      <span style={{ color: PRIORITY_COLOR[t.priority] }}>●</span>
      <span className="min-w-0 flex-1 truncate">{t.title}</span>
      <span className="shrink-0 text-xs text-muted">{ws(t.workspace_id)}{t.due_at ? ` · ${fmtDate(t.due_at)}` : ""}</span>
    </li>
  );
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Sunrise className="text-cyan" size={20} />
        <div className="mr-auto"><div className="label">Kewin – Daily Briefing</div><div className="text-lg font-medium">{fmtDate(b.day)}</div></div>
        <button className="btn btn-primary" onClick={generate} disabled={busy}><Sparkles size={15} /> {busy ? "Formuliere…" : aiText ? "Neu formulieren" : "Von JARVIS formulieren"}</button>
        {aiText && <button className="btn btn-ghost !px-2.5" onClick={speak} aria-label="Vorlesen" title="Vorlesen (Browser-Stimme)"><Volume2 size={16} /></button>}
      </div>
      {err && <div className="mb-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm text-warn">{err}</div>}
      {aiText && <div className="mb-5 rounded-xl border border-electric/25 bg-blue/5 p-4"><Markdown text={aiText} /></div>}

      <div className="grid gap-5 md:grid-cols-2">
        <Sec n={1} title="Persönlicher Status">
          <Kv k="Gewohnheiten heute" v={b.personal.habitsTotal ? `${b.personal.habitsDone}/${b.personal.habitsTotal}` : "keine angelegt"} />
          <Kv k="Fokus heute / Woche" v={`${b.personal.focusMinToday} / ${b.personal.focusMinWeek} Min.`} />
          <Kv k="Trainings diese Woche" v={String(b.personal.workoutsThisWeek)} />
          <Kv k="Review gestern" v={b.personal.eveningReviewYesterday ? "erledigt" : "fehlt"} warn={!b.personal.eveningReviewYesterday} />
        </Sec>
        <Sec n={2} title="Heute">
          {!b.schedule.calendarConnected && <p className="mb-1 text-xs text-muted">Kalender nicht verbunden (Phase 7) – nur fällige Aufgaben.</p>}
          {b.schedule.dueToday.length === 0 && b.schedule.overdue.length === 0 ? <Empty /> : (
            <ul className="space-y-1 text-sm">{b.schedule.overdue.slice(0, 3).map(taskLine)}{b.schedule.dueToday.slice(0, 5).map(taskLine)}</ul>)}
          {b.schedule.overdue.length > 0 && <p className="mt-1 text-xs text-err">{b.schedule.overdue.length} überfällig</p>}
        </Sec>
        <Sec n={3} title="Drei wichtigste Prioritäten">
          {b.priorities.length ? <ol className="space-y-1 text-sm">{b.priorities.map((t, i) => (
            <li key={t.id} className="flex gap-2"><span className="text-cyan">{i + 1}.</span><span className="min-w-0 flex-1 truncate">{t.title}</span>
              <span className="text-xs text-muted">{PRIORITY_LABEL[t.priority]} · {t.score}</span></li>))}</ol> : <Empty />}
        </Sec>
        <Sec n="4–5" title="NGCX & VenturesX">
          <ul className="space-y-1.5 text-sm">{b.ventures.map((v) => (
            <li key={v.id}><span className="font-medium">{v.name}</span> <span className="text-muted">· {v.phase ?? "Phase offen"} · {v.openTasks} offen{v.critical ? `, ${v.critical} kritisch` : ""}</span>
              <div className="text-xs text-muted">Wissen zuletzt aktualisiert: {v.lastKnowledgeUpdate ? fmtDate(v.lastKnowledgeUpdate) : "–"}</div></li>))}</ul>
        </Sec>
        <Sec n={6} title="Offene Entscheidungen">
          {b.decisions.uncertain.length === 0 && !b.decisions.proposals ? <Empty /> : (
            <ul className="space-y-1 text-sm">
              {b.decisions.uncertain.map((u) => <li key={u.id}>Unsicher: „{u.title}“ <span className="text-xs text-muted">({ws(u.workspace_id)})</span></li>)}
              {b.decisions.proposals > 0 && <li><a className="text-cyan" href="/memory?status=proposed">{b.decisions.proposals} Gedächtnis-Vorschläge prüfen →</a></li>}
            </ul>)}
        </Sec>
        <Sec n={7} title="Studium">
          {b.university.exams.length === 0 && b.university.dueSoon.length === 0 ? <Empty /> : (
            <ul className="space-y-1 text-sm">
              {b.university.exams.map((e) => <li key={e.name}><span className={e.daysLeft <= 14 ? "text-warn" : ""}>{e.name}</span> <span className="text-muted">– Prüfung in {e.daysLeft} T. · {e.openTasks} Lernaufgaben</span></li>)}
              {b.university.dueSoon.map(taskLine)}
            </ul>)}
        </Sec>
        <Sec n={8} title="Finanzen">
          {!b.finance ? <p className="text-sm text-muted">Keine Buchungen erfasst. <a className="text-cyan" href="/finance">Finanzen einrichten →</a></p> : (
            <>
              <Kv k="Noch verfügbar (Monat)" v={fmtEUR(b.finance.available)} warn={b.finance.available < 0} />
              <Kv k="Pro Tag (Rest)" v={`${fmtEUR(b.finance.perDay)} · ${b.finance.daysLeft} Tage`} />
              {b.finance.warnings.length > 0 && <p className="mt-1 text-xs text-warn">{b.finance.warnings.length} Budget-Warnung(en)</p>}
            </>)}
        </Sec>
        <Sec n={9} title="Risiken">
          {b.risks.length ? <ul className="space-y-1 text-sm">{b.risks.map((r, i) => <li key={i} className="flex gap-2"><AlertTriangle size={13} className="mt-1 shrink-0 text-warn" />{r}</li>)}</ul> : <Empty text="Keine erkannten Risiken." />}
        </Sec>
      </div>
      <div className="mt-5 rounded-xl bg-ink-900/70 p-4">
        <div className="label mb-2">10 · Empfohlene nächste Schritte</div>
        {b.nextActions.length ? <ol className="list-decimal space-y-1 pl-5 text-sm">{b.nextActions.map((a, i) => <li key={i}>{a}</li>)}</ol> : <Empty />}
      </div>
      {b.goals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">{b.goals.map((g) => (
          <span key={g.id} className="chip">{g.title}: {g.progress == null ? "Fortschritt unbekannt" : `${Math.round(g.progress * 100)} %`}{g.daysLeft != null ? ` · ${g.daysLeft} T.` : ""}</span>))}</div>
      )}
      <p className="mt-4 text-[11px] text-muted">Abschnitte 1–10 sind regelbasiert aus deinen Daten berechnet. Nachrichten/News folgen mit dem Research Radar (Phase 3).</p>
    </section>
  );
}

function Planner({ initial, workspaces }: { initial: Plan | null; workspaces: { id: string; name: string }[] }) {
  const [plan, setPlan] = useState<Plan | null>(initial);
  const [minutes, setMinutes] = useState(90);
  const [start, setStart] = useState("");
  const [ws, setWs] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function make() {
    setBusy(true); setMsg(null);
    try { setPlan((await apiFetch<{ plan: Plan }>("/api/myday", { body: { action: "plan", availableMin: minutes, start: start || null, workspaceId: ws || null, useAI } })).plan); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function focus(b: Block) {
    try {
      await apiFetch("/api/focus", { body: { taskId: b.taskId, plannedMin: Math.min(240, Math.max(5, b.minutes)), label: b.title } });
      window.location.href = "/discipline";
    } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2"><CalendarClock size={18} className="text-cyan" /><h2 className="font-medium">Zeit planen</h2></div>
      <div className="mb-2 flex flex-wrap gap-1.5">{[30, 60, 90, 120, 180, 240].map((m) => (
        <button key={m} onClick={() => setMinutes(m)} className={`btn !px-2.5 !py-1 text-xs ${minutes === m ? "btn-primary" : "btn-ghost"}`}>{m >= 60 ? `${m / 60} h` : `${m} Min.`}</button>))}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Minuten<input className="input mt-1" type="number" min={15} max={960} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
        <label className="text-xs text-muted">Start (leer = jetzt)<input className="input mt-1" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select className="input !w-auto" value={ws} onChange={(e) => setWs(e.target.value)} aria-label="Workspace">
          <option value="">Alle Bereiche</option>{workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} /> KI optimieren</label>
        <button className="btn btn-primary ml-auto" onClick={make} disabled={busy || minutes < 15}>{busy ? "Plane…" : "Plan erstellen"}</button>
      </div>
      {msg && <div className="mt-2 text-sm text-err">{msg}</div>}
      {plan && (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-xs text-muted"><span>{plan.availableMin} Min. ab {plan.startAt}</span><span className="chip">{plan.method === "ai" ? "KI-optimiert" : "regelbasiert"}</span></div>
          <ol className="space-y-1.5">
            {plan.blocks.map((b, i) => (
              <li key={i} className={`flex items-start gap-3 rounded-lg p-2.5 ${b.kind === "break" ? "bg-ink-900/40" : "bg-ink-900/80"}`}>
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{b.start}–{b.end}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{b.kind === "break" ? <span className="text-muted"><Coffee size={12} className="mr-1 inline" />Pause</span> : b.title}</div>
                  <div className="text-xs text-muted">{b.reason}</div>
                </div>
                {b.taskId && <button className="rounded p-1.5 text-muted hover:text-cyan" onClick={() => focus(b)} aria-label="Fokus starten" title="Fokus-Session starten"><Play size={14} /></button>}
              </li>
            ))}
          </ol>
          {plan.unplanned > 0 && <p className="mt-2 text-xs text-muted">{plan.unplanned} Aufgabe(n) passen nicht in dieses Zeitfenster – bewusst nicht eingeplant.</p>}
          {plan.warnings.map((w, i) => <p key={i} className="mt-1 text-xs text-warn">{w}</p>)}
        </div>
      )}
    </section>
  );
}

function EveningReview({ stats, initial, feedback: initialFb, onSaved }: { stats: Stats; initial: Evening | null; feedback: string | null; onSaved: () => void }) {
  const [f, setF] = useState<Evening>(initial ?? {});
  const [feedback, setFeedback] = useState(initialFb);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof Evening, v: string | number) => setF({ ...f, [k]: v });
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await apiFetch<{ feedback: string | null }>("/api/myday", { body: { action: "evening", withAI: true, ...f, energy: f.energy ?? null, focus: f.focus ?? null } });
      setFeedback(r.feedback);
      setMsg(r.feedback ? "Gespeichert." : "Gespeichert. (Kein KI-Feedback – kein Anbieter verbunden.)");
      onSaved();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  const area = (k: keyof Evening, label: string, ph: string) => (
    <label className="block text-xs text-muted">{label}<textarea className="input mt-1" rows={2} placeholder={ph} value={(f[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} /></label>
  );
  const scale = (k: "energy" | "focus", label: string) => (
    <div className="text-xs text-muted">{label}
      <div className="mt-1 flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => set(k, n)} className={`h-8 w-8 rounded-lg border text-sm ${f[k] === n ? "border-electric bg-blue/20 text-fg" : "border-ink-600"}`}>{n}</button>))}</div>
    </div>
  );
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center gap-2"><Moon size={18} className="text-cyan" /><h2 className="font-medium">Abend-Review</h2></div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-ink-900/70 py-2"><div className="text-lg font-semibold text-fg">{stats.done}</div>erledigt</div>
        <div className="rounded-lg bg-ink-900/70 py-2"><div className={`text-lg font-semibold ${stats.due_open ? "text-warn" : "text-fg"}`}>{stats.due_open}</div>fällig offen</div>
        <div className="rounded-lg bg-ink-900/70 py-2"><div className="text-lg font-semibold text-fg">{stats.focus_min}</div>Min. Fokus</div>
      </div>
      {stats.doneTitles.length > 0 && <p className="text-xs text-muted">Erledigt laut System: {stats.doneTitles.join(", ")}</p>}
      {area("accomplished", "Was habe ich erreicht?", "Ergebnisse, nicht Aktivitäten")}
      {area("notDone", "Was habe ich nicht erreicht?", "")}
      {area("why", "Warum nicht?", "Unklarheit, Überlastung, Ablenkung, Energie …")}
      {area("learned", "Was habe ich gelernt?", "")}
      {area("improve", "Was mache ich morgen besser?", "")}
      <div className="flex flex-wrap gap-6">{scale("energy", "Energie")}{scale("focus", "Fokus")}</div>
      <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Speichere…" : "Review speichern"}</button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      {feedback && <div className="rounded-xl border border-electric/25 bg-blue/5 p-3"><div className="label mb-1">JARVIS Feedback</div><Markdown text={feedback} /></div>}
    </section>
  );
}

function Sec({ n, title, children }: { n: number | string; title: string; children: React.ReactNode }) {
  return <div className="min-w-0"><div className="label mb-1.5">{n} · {title}</div>{children}</div>;
}
function Kv({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return <div className="flex justify-between gap-2 text-sm"><span className="text-muted">{k}</span><span className={warn ? "text-warn" : ""}>{v}</span></div>;
}
function Empty({ text = "Nichts Relevantes." }: { text?: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}
