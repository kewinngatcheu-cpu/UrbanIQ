import "server-only";
import type { UserDb } from "@/lib/db";
import type { Insight } from "@/lib/insights";
import { dayKey, addDays, fmt } from "@/lib/tz";
import { translate, type T } from "@/lib/i18n";

/**
 * Rule-based business insights over ONE organization's own data. Every insight lists its sources
 * and says whether it is a confirmed fact or a conclusion ONE draws from the data.
 */
export async function computeBusinessInsights(db: UserDb, names: Map<string, string>, tz = "UTC", tr: T = (s, v) => translate("en", s, v), lang: "en" | "de" = "en", now = new Date()): Promise<Insight[]> {
  const [tasks, projects, actions, memories] = await Promise.all([db.select("tasks"), db.select("projects"), db.select("action_items"), db.select("memories")]);
  const out: Insight[] = [];
  const today = dayKey(now, tz);
  const open = tasks.filter((t) => t.status === "open");

  const overdue = open.filter((t) => t.due_at && dayKey(t.due_at, tz) < today);
  if (overdue.length) out.push({ id: "b-overdue", tone: "attention", certainty: "fact", title: tr(overdue.length === 1 ? "{n} overdue item" : "{n} overdue items", { n: overdue.length }), body: tr("Reassign or reschedule them so nothing falls through the cracks."), sources: overdue.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/business/tasks?filter=overdue" });

  const dl = open.filter((t) => t.kind === "deadline" && t.due_at && dayKey(t.due_at, tz) >= today && dayKey(t.due_at, tz) <= addDays(today, 7));
  if (dl.length) out.push({ id: "b-deadlines", tone: "attention", certainty: "fact", title: tr(dl.length === 1 ? "{n} deadline in the next 7 days" : "{n} deadlines in the next 7 days", { n: dl.length }), body: dl.map((t) => `${t.title} — ${fmt(t.due_at!, tz, { weekday: "short", day: "numeric", month: "short" }, lang)}${t.assignee_id && names.get(t.assignee_id) ? ` (${names.get(t.assignee_id)})` : ""}`).join(" · "), sources: dl.map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/business/tasks" });

  const activeProjects = projects.filter((p) => p.status === "active" && p.stage !== "done");
  const late = activeProjects.filter((p) => p.target_date && p.target_date < today);
  if (late.length) out.push({ id: "b-late", tone: "attention", certainty: "fact", title: tr(late.length === 1 ? "{n} project is past its target date" : "{n} projects are past their target date", { n: late.length }), body: tr("Update the target date or decide what is needed to finish."), sources: [], href: "/business/projects" });
  const noLead = activeProjects.filter((p) => !p.lead_id);
  if (noLead.length) out.push({ id: "b-nolead", tone: "info", certainty: "fact", title: tr(noLead.length === 1 ? "{n} project has no responsible person" : "{n} projects have no responsible person", { n: noLead.length }), body: noLead.map((p) => p.name).slice(0, 4).join(" · "), sources: [], href: "/business/projects" });
  const stalled = activeProjects.filter((p) => open.filter((t) => t.project_id === p.id).length === 0 && tasks.some((t) => t.project_id === p.id) === false);
  if (stalled.length) out.push({ id: "b-empty", tone: "info", certainty: "inference", title: tr(stalled.length === 1 ? "{n} active project has no tasks yet" : "{n} active projects have no tasks yet", { n: stalled.length }), body: tr("Without tasks it's unclear who does what next. ONE suggests adding the first steps."), sources: [], href: "/business/projects" });

  const waiting = actions.filter((a) => a.status === "waiting");
  if (waiting.length) out.push({ id: "b-waiting", tone: "info", certainty: "fact", title: tr(waiting.length === 1 ? "{n} action is waiting for input" : "{n} actions are waiting for input", { n: waiting.length }), body: tr("Missing details are blocking these matters."), sources: waiting.map((a) => ({ type: "action", id: a.id, title: a.title })), href: "/business/action" });
  const ext = actions.filter((a) => a.status === "waiting_external" && now.getTime() - Date.parse(a.updated_at) > 7 * 86400000);
  if (ext.length) out.push({ id: "b-followup", tone: "attention", certainty: "inference", title: tr(ext.length === 1 ? "{n} matter has had no reply for over a week" : "{n} matters have had no reply for over a week", { n: ext.length }), body: tr("A short follow-up is probably due."), sources: ext.map((a) => ({ type: "action", id: a.id, title: a.title })), href: "/business/action" });

  const load = new Map<string, number>();
  for (const t of open) if (t.assignee_id) load.set(t.assignee_id, (load.get(t.assignee_id) ?? 0) + 1);
  const heavy = [...load.entries()].filter(([, n]) => n >= 10);
  if (heavy.length) out.push({ id: "b-load", tone: "info", certainty: "inference", title: tr("Workload is uneven"), body: heavy.map(([id, n]) => tr("{name} has {n} open tasks", { name: names.get(id) ?? "—", n })).join(" · "), sources: [], href: "/business/tasks" });

  const contracts = memories.filter((m) => /(vertrag|contract|agreement|vereinbarung|lizenz|license|lease|miet)/i.test(m.title));
  const withoutDeadline = contracts.filter((m) => !tasks.some((t) => t.source_memory_id === m.id && t.kind === "deadline"));
  if (withoutDeadline.length) out.push({ id: "b-contracts", tone: "info", certainty: "inference", title: tr(withoutDeadline.length === 1 ? "{n} contract has no deadline tracked" : "{n} contracts have no deadline tracked", { n: withoutDeadline.length }), body: tr("They may contain notice periods. Open them and let ONE find tasks & deadlines."), sources: withoutDeadline.slice(0, 5).map((m) => ({ type: "memory", id: m.id, title: m.title })), href: "/business/memory" });

  const docs = memories.filter((m) => m.kind === "document" && !m.summary);
  if (docs.length) out.push({ id: "b-summaries", tone: "info", certainty: "fact", title: tr(docs.length === 1 ? "{n} document hasn't been summarised" : "{n} documents haven't been summarised", { n: docs.length }), body: tr("Summaries help the whole team understand documents at a glance."), sources: docs.slice(0, 5).map((m) => ({ type: "memory", id: m.id, title: m.title })), href: "/business/memory" });

  const doneWeek = tasks.filter((t) => t.status === "done" && t.completed_at && Date.parse(t.completed_at) > now.getTime() - 7 * 86400000);
  if (doneWeek.length) out.push({ id: "b-momentum", tone: "positive", certainty: "fact", title: tr("The team completed {n} tasks this week", { n: doneWeek.length }), body: tr("Nice momentum. Keep going."), sources: [] });
  return out;
}
