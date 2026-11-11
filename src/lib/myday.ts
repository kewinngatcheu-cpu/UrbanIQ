import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { listTasks, priorityScore, type Task } from "@/lib/tasks";
import { listWorkspaces } from "@/lib/workspaces";
import { listGoals, goalAlignment } from "@/lib/goals";
import { listHabits, focusStats, procrastinationCandidates } from "@/lib/discipline";
import { financeOverview } from "@/lib/finance/service";
import { CATEGORIES } from "@/lib/finance/calc";
import { listCourses } from "@/lib/lifestyle";
import { addDays, berlinDay, berlinMinutesNow, daysBetween, fmtEUR, fmtHM } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { resolveEnabledProvider } from "@/lib/ai/registry";

/* ───────────────────────────── Briefing (deterministic) ───────────────────────────── */

type TaskLite = Pick<Task, "id" | "title" | "priority" | "due_at" | "workspace_id" | "postponed_count" | "estimate_min"> & { score?: number };
const lite = (t: Task, now?: Date): TaskLite => ({ id: t.id, title: t.title, priority: t.priority, due_at: t.due_at, workspace_id: t.workspace_id,
  postponed_count: t.postponed_count, estimate_min: t.estimate_min, ...(now ? { score: priorityScore(t, now) } : {}) });

export interface Briefing {
  day: string;
  generatedAt: string;
  personal: { habitsDone: number; habitsTotal: number; focusMinToday: number; focusMinWeek: number; workoutsThisWeek: number; eveningReviewYesterday: boolean };
  schedule: { calendarConnected: false; dueToday: TaskLite[]; overdue: TaskLite[] };
  priorities: TaskLite[];
  ventures: { id: string; name: string; phase: string | null; openTasks: number; critical: number; lastKnowledgeUpdate: string | null }[];
  decisions: { uncertain: { id: string; title: string; workspace_id: string }[]; proposals: number };
  university: { exams: { name: string; exam_date: string; daysLeft: number; openTasks: number }[]; dueSoon: TaskLite[] };
  finance: null | { available: number; perDay: number; daysLeft: number; warnings: { category: string; ratio: number; state: string }[] };
  goals: { id: string; title: string; progress: number | null; target_date: string | null; daysLeft: number | null }[];
  risks: string[];
  nextActions: string[];
}

export async function buildBriefing(now = new Date()): Promise<Briefing> {
  const today = berlinDay(now);
  const db = await getDb();
  const [tasks, workspaces, goals, habits, focus, fin, courses, stalled, align] = await Promise.all([
    listTasks({ status: "open" }), listWorkspaces(), listGoals({ status: "active" }), listHabits(today), focusStats(today),
    financeOverview(today), listCourses(), procrastinationCandidates(), goalAlignment(),
  ]);
  const [{ workouts }] = await db.query<{ workouts: number }>(
    `SELECT count(*)::int AS workouts FROM fitness_workouts WHERE day >= date_trunc('week', $1::date)`, [today]);
  const [yReview] = await db.query(`SELECT 1 FROM daily_reviews WHERE day = $1 AND evening IS NOT NULL`, [addDays(today, -1)]);
  // Only nag about a missing review once the habit has been started (any earlier review exists).
  const [anyEarlier] = await db.query(`SELECT 1 FROM daily_reviews WHERE day < $1 AND evening IS NOT NULL LIMIT 1`, [addDays(today, -1)]);
  const uncertain = await db.query<{ id: string; title: string; workspace_id: string }>(
    `SELECT id, title, workspace_id FROM memories WHERE status = 'uncertain' ORDER BY importance DESC, updated_at DESC LIMIT 5`);
  const [{ proposals }] = await db.query<{ proposals: number }>(`SELECT count(*)::int AS proposals FROM memories WHERE status = 'proposed'`);
  const memUpdates = await db.query<{ workspace_id: string; last: string }>(
    `SELECT workspace_id, max(updated_at) AS last FROM memories WHERE status IN ('active','uncertain') GROUP BY workspace_id`);

  const dayOf = (iso: string) => berlinDay(new Date(iso));
  const dueToday = tasks.filter((t) => t.due_at && dayOf(t.due_at) === today).map((t) => lite(t));
  const overdue = tasks.filter((t) => t.due_at && dayOf(t.due_at) < today).map((t) => lite(t));
  const priorities = [...tasks].sort((a, b) => priorityScore(b, now) - priorityScore(a, now)).slice(0, 3).map((t) => lite(t, now));

  const ventures = workspaces.filter((w) => w.kind === "business").map((w) => {
    const wt = tasks.filter((t) => t.workspace_id === w.id);
    return { id: w.id, name: w.name, phase: ((w.profile as { phase?: string }).phase ?? null), openTasks: wt.length,
      critical: wt.filter((t) => t.priority === "critical").length, lastKnowledgeUpdate: memUpdates.find((m) => m.workspace_id === w.id)?.last ?? null };
  });

  const exams = courses.filter((c) => c.status === "active" && c.exam_date && c.exam_date >= today)
    .map((c) => ({ name: c.name, exam_date: c.exam_date!, daysLeft: daysBetween(today, c.exam_date!), openTasks: c.open_tasks }))
    .filter((e) => e.daysLeft <= 60);
  const courseIds = new Set(courses.map((c) => c.id));
  const dueSoon = tasks.filter((t) => t.course_id && courseIds.has(t.course_id) && t.due_at && dayOf(t.due_at) <= addDays(today, 7)).map((t) => lite(t));

  const finance = fin.spendable ? {
    available: fin.spendable.available, perDay: fin.spendable.perDay, daysLeft: fin.spendable.daysLeft,
    warnings: fin.budgetStatus.filter((b) => b.state !== "ok").map((b) => ({ category: b.category, ratio: b.ratio, state: b.state })),
  } : null;

  const goalsOut = goals.map((g) => ({ id: g.id, title: g.title, progress: g.progress ?? null, target_date: g.target_date,
    daysLeft: g.target_date ? daysBetween(today, g.target_date) : null }));

  // ── Risks (rule-based, each traceable to data) ──
  const risks: string[] = [];
  if (overdue.length) risks.push(`${overdue.length} überfällige Aufgabe(n), älteste: „${overdue[0].title}“.`);
  for (const t of stalled.filter((t) => t.postponed_count >= 3).slice(0, 2)) risks.push(`„${t.title}“ wurde ${t.postponed_count}× verschoben – Ursache klären (Discipline).`);
  for (const e of exams.filter((e) => e.daysLeft <= 14)) risks.push(`Prüfung ${e.name} in ${e.daysLeft} Tag(en)${e.openTasks ? ` – noch ${e.openTasks} offene Lernaufgabe(n)` : " – keine Lernaufgaben geplant"}.`);
  for (const g of goalsOut.filter((g) => g.daysLeft != null && g.daysLeft <= 14 && g.daysLeft >= 0 && (g.progress ?? 0) < 0.7))
    risks.push(`Ziel „${g.title}“ endet in ${g.daysLeft} Tagen, Fortschritt ${g.progress == null ? "unbekannt" : Math.round(g.progress * 100) + " %"}.`);
  for (const w of finance?.warnings ?? []) risks.push(`Budget ${CATEGORIES[w.category]?.label ?? w.category}: ${Math.round(w.ratio * 100)} % verbraucht${w.state === "over" ? " (überschritten)" : ""}.`);
  if (finance && finance.available < 0) risks.push(`Monatsbudget rechnerisch überzogen: ${fmtEUR(finance.available)}.`);
  if (align.ratio != null && align.done >= 5 && align.ratio < 0.4)
    risks.push(`Nur ${Math.round(align.ratio * 100)} % der erledigten Aufgaben (7 Tage) zahlen auf Ziele, Studium oder Ventures ein.`);

  // ── Recommended next actions ──
  const nextActions: string[] = [];
  if (priorities[0]) nextActions.push(`Starte mit „${priorities[0].title}“ (${priorities[0].estimate_min ?? 45} Min.) als Fokus-Session.`);
  const st = stalled.find((t) => t.postponed_count >= 3);
  if (st) nextActions.push(`Triff eine Entscheidung zu „${st.title}“: zerlegen, delegieren oder streichen.`);
  const openHabits = habits.filter((h) => !h.days.includes(today));
  if (openHabits.length) nextActions.push(`Gewohnheiten heute offen: ${openHabits.map((h) => h.title).slice(0, 3).join(", ")}.`);
  if (!yReview && anyEarlier) nextActions.push("Gestern fehlt das Abend-Review – 3 Minuten heute Abend einplanen.");
  if (proposals) nextActions.push(`${proposals} Gedächtnis-Vorschläge im Memory Center prüfen.`);

  return {
    day: today,
    generatedAt: now.toISOString(),
    personal: { habitsDone: habits.length - openHabits.length, habitsTotal: habits.length, focusMinToday: focus.today_min, focusMinWeek: focus.week_min,
      workoutsThisWeek: workouts, eveningReviewYesterday: Boolean(yReview) },
    schedule: { calendarConnected: false, dueToday, overdue },
    priorities,
    ventures,
    decisions: { uncertain, proposals },
    university: { exams, dueSoon },
    finance,
    goals: goalsOut,
    risks,
    nextActions,
  };
}

/** Privacy filter for anything sent to an AI provider. */
export async function briefingForAI(b: Briefing) {
  const s = await getSettings();
  return { ...b, finance: s.aiContextFinance ? b.finance : "nicht freigegeben", personal: s.aiContextHealth ? b.personal : { ...b.personal, workoutsThisWeek: "nicht freigegeben" } };
}

const BRIEFING_SYSTEM = `Du bist JARVIS. Formuliere aus den JSON-Daten Kewins Morgen-Briefing auf Deutsch.
Struktur (Überschriften fett, kurz): Persönlicher Status · Heute · Drei Prioritäten · NGCX · VenturesX · Offene Entscheidungen · Studium · Finanzen · Risiken · Nächster Schritt.
Regeln: Nur Informationen aus den Daten verwenden. Wenn ein Bereich leer ist, schreibe knapp "nichts Relevantes" – erfinde nichts.
Kein Kalender verbunden → sage das bei "Heute". Keine Nachrichten/News erfinden. Keine Motivationssprüche. Maximal 220 Wörter.
Beende mit einer klaren Empfehlung, womit Kewin jetzt anfangen soll, und begründe sie in einem Satz.`;

export async function generateBriefingText(b: Briefing): Promise<{ text: string; model: string } | null> {
  const settings = await getSettings();
  const provider = await resolveEnabledProvider(settings.aiProvider);
  if (!provider) return null;
  let text = "";
  const r = await provider.stream({
    system: BRIEFING_SYSTEM,
    messages: [{ role: "user", content: `<daten>\n${JSON.stringify(await briefingForAI(b))}\n</daten>` }],
    model: provider.id === "anthropic" ? settings.anthropicModel : settings.openaiModel,
    effort: "low", maxTokens: 3000,
  }, (t) => { text += t; });
  await audit({ actor: "jarvis", action: "briefing.generate", workspaceId: "personal", level: 2, details: { model: r.model } });
  return { text: r.text || text, model: r.model };
}

/**
 * Compact, privacy-filtered status block for the chat system prompt.
 * Personal workspace: goals, habits, focus, exams, finance (if allowed), fitness (if allowed).
 * Business workspace: only that workspace's goals – personal data never crosses into business chats.
 */
export async function chatSnapshot(workspaceId: string, now = new Date()): Promise<string> {
  const today = berlinDay(now);
  const settings = await getSettings();
  const lines: string[] = [];
  const goals = await listGoals({ status: "active", workspaceId });
  if (goals.length) lines.push("Aktive Ziele: " + goals.map((g) => `${g.title} (${g.progress == null ? "Fortschritt unbekannt" : Math.round(g.progress * 100) + " %"}${g.target_date ? `, bis ${g.target_date}` : ""})`).join("; "));
  if (workspaceId !== "personal") return lines.join("\n");

  const [habits, focus, courses] = await Promise.all([listHabits(today), focusStats(today), listCourses()]);
  if (habits.length) lines.push(`Gewohnheiten heute: ${habits.filter((h) => h.days.includes(today)).length}/${habits.length} erledigt (offen: ${habits.filter((h) => !h.days.includes(today)).map((h) => h.title).join(", ") || "keine"})`);
  lines.push(`Fokuszeit: heute ${focus.today_min} Min., diese Woche ${focus.week_min} Min.`);
  const exams = courses.filter((c) => c.status === "active" && c.exam_date && c.exam_date >= today);
  if (exams.length) lines.push("Prüfungen: " + exams.map((c) => `${c.name} am ${c.exam_date} (${daysBetween(today, c.exam_date!)} Tage, ${c.open_tasks} offene Lernaufgaben)`).join("; "));
  if (settings.aiContextFinance) {
    const fin = await financeOverview(today);
    if (fin.spendable) {
      lines.push(`Finanzen ${fin.month}: noch verfügbar ${fmtEUR(fin.spendable.available)} (${fmtEUR(fin.spendable.perDay)}/Tag, ${fin.spendable.daysLeft} Tage), Einnahmen gebucht ${fmtEUR(fin.current.income)}, Fixkosten ${fmtEUR(fin.spendable.fixedCosts)}, variabel ${fmtEUR(fin.current.variable)}, Sparquote ${fin.current.savingsRate == null ? "–" : Math.round(fin.current.savingsRate * 100) + " %"}.`
        + (fin.budgetStatus.some((b) => b.state !== "ok") ? ` Budget-Warnungen: ${fin.budgetStatus.filter((b) => b.state !== "ok").map((b) => `${CATEGORIES[b.category]?.label ?? b.category} ${Math.round(b.ratio * 100)} %`).join(", ")}.` : "")
        + (fin.balances.liquid != null ? ` Kontostand (manuell, Stand ${fin.balances.asOf}): ${fmtEUR(fin.balances.liquid)}, Erspartes ${fmtEUR(fin.balances.saved ?? 0)}.` : ""));
    } else lines.push("Finanzen: keine Buchungen erfasst.");
  } else lines.push("Finanzen: vom Nutzer nicht für die KI freigegeben.");
  if (settings.aiContextHealth) {
    const db = await getDb();
    const [w] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM fitness_workouts WHERE day >= date_trunc('week', $1::date)`, [today]);
    lines.push(`Training diese Woche: ${w.n} Einheiten.`);
  }
  return lines.join("\n");
}

/* ───────────────────────────── Time-block planner ───────────────────────────── */

export interface PlanBlock { start: string; end: string; minutes: number; kind: "task" | "break"; taskId: string | null; title: string; reason: string }
export interface Plan { day: string; availableMin: number; startAt: string; blocks: PlanBlock[]; unplanned: number; warnings: string[]; method: "rules" | "ai" }

export const planInput = z.object({
  availableMin: z.number().int().min(15).max(16 * 60),
  start: z.string().regex(/^\d{2}:\d{2}$/).nullish(), // default: now (rounded up to 5 min)
  workspaceId: z.string().max(64).nullish(),
  useAI: z.boolean().default(false),
});

const DEFAULT_EST = 45;
const toMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/**
 * Rule-based plan: highest priority score first, default estimate 45 min, tasks too long for the remaining time
 * get a partial block (≥ 25 min), 10-minute break after ≥ 90 min of continuous work. Deterministic and explainable.
 */
export function planRules(tasks: Task[], availableMin: number, startMin: number, now = new Date()): Omit<Plan, "day" | "method"> {
  const sorted = [...tasks].sort((a, b) => priorityScore(b, now) - priorityScore(a, now));
  const blocks: PlanBlock[] = [];
  const warnings: string[] = [];
  let t = startMin, left = availableMin, streak = 0, planned = 0;
  if (sorted.some((x) => !x.estimate_min)) warnings.push(`Für Aufgaben ohne Schätzung wurden ${DEFAULT_EST} Minuten angenommen.`);
  for (const task of sorted) {
    if (left < 25) break;
    if (streak >= 90 && left >= 35) {
      blocks.push({ start: fmtHM(t), end: fmtHM(t + 10), minutes: 10, kind: "break", taskId: null, title: "Pause", reason: "Nach 90 Minuten Fokus kurz abschalten." });
      t += 10; left -= 10; streak = 0;
    }
    const est = task.estimate_min ?? DEFAULT_EST;
    const minutes = Math.min(est, left);
    if (minutes < 25 && minutes < est) break;
    const score = priorityScore(task, now);
    const why = [task.priority === "critical" ? "kritisch" : task.priority === "high" ? "hohe Priorität" : null,
      task.due_at && new Date(task.due_at) < now ? "überfällig" : task.due_at ? `fällig ${new Date(task.due_at).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}` : null,
      task.workspace_id !== "personal" ? task.workspace_id.toUpperCase() : null,
      task.postponed_count ? `${task.postponed_count}× verschoben` : null].filter(Boolean).join(", ");
    blocks.push({ start: fmtHM(t), end: fmtHM(t + minutes), minutes, kind: "task", taskId: task.id,
      title: minutes < est ? `${task.title} (Teil 1)` : task.title, reason: `Score ${score}${why ? ` – ${why}` : ""}` });
    t += minutes; left -= minutes; streak += minutes; planned++;
  }
  if (!sorted.length) warnings.push("Keine offenen Aufgaben – lege zuerst Aufgaben an.");
  else if (planned === sorted.length && left >= 15) warnings.push(`${left} Min. bleiben frei – keine weiteren offenen Aufgaben. Bewusst Pause, Lernen oder ein Ziel voranbringen.`);
  return { availableMin, startAt: fmtHM(startMin), blocks, unplanned: sorted.length - planned, warnings };
}

const aiPlanSchema = z.object({
  blocks: z.array(z.object({ task_id: z.string().nullable(), minutes: z.number().int(), title: z.string(), reason: z.string() })),
  warning: z.string().nullable(),
});

export async function makePlan(raw: z.input<typeof planInput>, now = new Date()): Promise<Plan> {
  const p = planInput.parse(raw);
  const day = berlinDay(now);
  const startMin = p.start ? toMin(p.start) : Math.ceil(berlinMinutesNow(now) / 5) * 5;
  const tasks = (await listTasks({ status: "open", workspaceId: p.workspaceId ?? undefined })).slice(0, 40);
  const rules = planRules(tasks, p.availableMin, startMin, now);
  let plan: Plan = { day, method: "rules", ...rules };

  if (p.useAI && tasks.length) {
    const settings = await getSettings();
    const provider = await resolveEnabledProvider(settings.aiProvider);
    if (!provider) plan.warnings.push("KI nicht verfügbar – regelbasierter Plan.");
    else {
      try {
        const candidates = [...tasks].sort((a, b) => priorityScore(b, now) - priorityScore(a, now)).slice(0, 15)
          .map((t) => ({ id: t.id, title: t.title, priority: t.priority, due: t.due_at, workspace: t.workspace_id, estimate_min: t.estimate_min, postponed: t.postponed_count, score: priorityScore(t, now) }));
        const out = await provider.json({
          system: `Du bist JARVIS und planst Kewins verfügbare Zeit. Wähle aus den Kandidaten die wirkungsvollste Reihenfolge.
Regeln: Summe der Minuten ≤ ${p.availableMin}. Nur task_id aus der Liste oder null für Pausen. Pausen nur nach ≥90 Min. Arbeit.
Bevorzuge Deep Work an strategisch wichtigen, überfälligen oder kritischen Aufgaben. Keine Beschäftigungstherapie. Begründung je Block max. 15 Wörter, Deutsch.`,
          prompt: JSON.stringify({ verfuegbar_min: p.availableMin, start: fmtHM(startMin), kandidaten: candidates }),
          schema: aiPlanSchema,
          model: provider.id === "anthropic" ? settings.anthropicModel : settings.openaiModel,
        });
        const ids = new Set(tasks.map((t) => t.id));
        const total = out?.blocks.reduce((a, b) => a + b.minutes, 0) ?? Infinity;
        if (out && out.blocks.length && total <= p.availableMin && out.blocks.every((b) => b.minutes > 0 && (b.task_id === null || ids.has(b.task_id)))) {
          let t = startMin;
          plan = { day, method: "ai", availableMin: p.availableMin, startAt: fmtHM(startMin), unplanned: tasks.length - out.blocks.filter((b) => b.task_id).length,
            warnings: out.warning ? [out.warning] : [],
            blocks: out.blocks.map((b) => { const blk: PlanBlock = { start: fmtHM(t), end: fmtHM(t + b.minutes), minutes: b.minutes, kind: b.task_id ? "task" : "break",
              taskId: b.task_id, title: b.task_id ? tasks.find((x) => x.id === b.task_id)!.title : "Pause", reason: b.reason }; t += b.minutes; return blk; }) };
          await audit({ actor: "jarvis", action: "plan.generate", workspaceId: "personal", level: 2, details: { method: "ai", blocks: plan.blocks.length } });
        } else plan.warnings.push("KI-Plan war ungültig (unbekannte Aufgaben oder zu lang) – regelbasierter Plan verwendet.");
      } catch (e) {
        plan.warnings.push(`KI-Fehler: ${e instanceof Error ? e.message : String(e)} – regelbasierter Plan verwendet.`);
      }
    }
  }
  const db = await getDb();
  await db.query(`INSERT INTO daily_reviews (day, plan) VALUES ($1,$2) ON CONFLICT (day) DO UPDATE SET plan = $2, updated_at = now()`, [day, JSON.stringify(plan)]);
  return plan;
}

/* ───────────────────────────── Evening review ───────────────────────────── */

export const eveningInput = z.object({
  accomplished: z.string().max(4000).default(""),
  notDone: z.string().max(4000).default(""),
  why: z.string().max(4000).default(""),
  learned: z.string().max(4000).default(""),
  improve: z.string().max(4000).default(""),
  energy: z.number().int().min(1).max(5).nullish(),
  focus: z.number().int().min(1).max(5).nullish(),
});

export async function dayStats(day: string) {
  const db = await getDb();
  const [r] = await db.query<{ done: number; due_open: number; focus_min: number }>(
    `SELECT
       (SELECT count(*)::int FROM tasks WHERE status = 'done' AND (completed_at AT TIME ZONE 'Europe/Berlin')::date = $1::date) AS done,
       (SELECT count(*)::int FROM tasks WHERE status IN ('open','in_progress') AND (due_at AT TIME ZONE 'Europe/Berlin')::date <= $1::date) AS due_open,
       (SELECT coalesce(sum(actual_min),0)::int FROM focus_sessions WHERE ended_at IS NOT NULL AND (started_at AT TIME ZONE 'Europe/Berlin')::date = $1::date) AS focus_min`,
    [day]);
  const doneTitles = await db.query<{ title: string }>(
    `SELECT title FROM tasks WHERE status = 'done' AND (completed_at AT TIME ZONE 'Europe/Berlin')::date = $1::date ORDER BY completed_at`, [day]);
  const habits = await listHabits(day);
  return { ...r, doneTitles: doneTitles.map((t) => t.title), habitsDone: habits.filter((h) => h.days.includes(day)).length, habitsTotal: habits.length };
}

export async function saveEvening(raw: z.input<typeof eveningInput>, opts: { withAI: boolean }, now = new Date()) {
  const e = eveningInput.parse(raw);
  const day = berlinDay(now);
  const stats = await dayStats(day);
  const evening = { ...e, stats, savedAt: now.toISOString() };
  const db = await getDb();
  await db.query(`INSERT INTO daily_reviews (day, evening) VALUES ($1,$2) ON CONFLICT (day) DO UPDATE SET evening = $2, updated_at = now()`, [day, JSON.stringify(evening)]);
  await audit({ actor: "owner", action: "review.evening", workspaceId: "personal", level: 3, details: { day } });
  let feedback: string | null = null;
  if (opts.withAI) {
    const settings = await getSettings();
    const provider = await resolveEnabledProvider(settings.aiProvider);
    if (provider) {
      const recent = await db.query<{ day: string; evening: unknown }>(
        `SELECT to_char(day,'YYYY-MM-DD') AS day, evening FROM daily_reviews WHERE evening IS NOT NULL AND day < $1 ORDER BY day DESC LIMIT 6`, [day]);
      let text = "";
      await provider.stream({
        system: `Du bist JARVIS. Gib Kewin ein ehrliches, knappes Feedback (max. 120 Wörter, Deutsch) zu seinem Abend-Review.
1) Ein Muster, das du in heute + den letzten Tagen siehst (nur aus den Daten). 2) Eine konkrete Verbesserung für morgen. 3) Die eine Aufgabe, die morgen zuerst kommen sollte.
Keine Motivationsfloskeln, kein Lob ohne Grund. Wenn Daten fehlen, sag das.`,
        messages: [{ role: "user", content: JSON.stringify({ heute: evening, letzte_tage: recent }) }],
        model: provider.id === "anthropic" ? settings.anthropicModel : settings.openaiModel, effort: "low", maxTokens: 2000,
      }, (t) => { text += t; });
      feedback = text.trim() || null;
      if (feedback) await db.query(`UPDATE daily_reviews SET ai_feedback = $2 WHERE day = $1`, [day, feedback]);
    }
  }
  return { evening, feedback };
}

export async function getDay(day: string) {
  const db = await getDb();
  const [r] = await db.query<{ day: string; briefing: Briefing | null; briefing_ai: string | null; plan: Plan | null; evening: Record<string, unknown> | null; ai_feedback: string | null }>(
    `SELECT to_char(day,'YYYY-MM-DD') AS day, briefing, briefing_ai, plan, evening, ai_feedback FROM daily_reviews WHERE day = $1`, [day]);
  return r ?? null;
}

export async function saveBriefing(b: Briefing, aiText: string | null) {
  const db = await getDb();
  await db.query(
    `INSERT INTO daily_reviews (day, briefing, briefing_ai) VALUES ($1,$2,$3)
     ON CONFLICT (day) DO UPDATE SET briefing = $2, briefing_ai = COALESCE($3, daily_reviews.briefing_ai), updated_at = now()`,
    [b.day, JSON.stringify(b), aiText]);
}

export async function recentReviews(limit = 14) {
  const db = await getDb();
  return db.query<{ day: string; evening: Record<string, unknown> | null; ai_feedback: string | null }>(
    `SELECT to_char(day,'YYYY-MM-DD') AS day, evening, ai_feedback FROM daily_reviews WHERE evening IS NOT NULL ORDER BY day DESC LIMIT $1`, [limit]);
}
