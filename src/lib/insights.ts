import "server-only";
import type { UserDb } from "@/lib/db";
import type { Source } from "@/lib/db/types";
import { dayKey, addDays, fmt } from "@/lib/tz";
import { translate, type T } from "@/lib/i18n";

/**
 * Transparent, rule-based insights. Every insight lists the stored items it is based on.
 * No AI involved — so they are always available and never hallucinated.
 */
export interface Insight {
  id: string;
  tone: "info" | "attention" | "positive";
  title: string;
  body: string;
  sources: Source[];
  href?: string;
  /** fact = confirmed by stored data; inference = a conclusion ONE draws (may be wrong). */
  certainty?: "fact" | "inference";
}

const day = 24 * 3600 * 1000;

export async function computeInsights(db: UserDb, tz = "UTC", tr: T = (s, v) => translate("en", s, v), lang: "en" | "de" = "en", now = new Date()): Promise<Insight[]> {
  const [tasks, actions, memories, reminders] = await Promise.all([
    db.select("tasks"),
    db.select("action_items"),
    db.select("memories", { order: { column: "created_at", ascending: false } }),
    db.select("reminders"),
  ]);
  const out: Insight[] = [];
  const open = tasks.filter((t) => t.status === "open");
  const today = dayKey(now, tz);

  const overdue = open.filter((t) => t.due_at && dayKey(t.due_at, tz) < today);
  if (overdue.length) {
    out.push({
      id: "overdue", certainty: "fact", tone: "attention",
      title: tr(overdue.length === 1 ? "{n} overdue item" : "{n} overdue items", { n: overdue.length }),
      body: tr("These were due before today. Reschedule them or mark them done to keep your plan realistic."),
      sources: overdue.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/app/life?view=all",
    });
  }

  const deadlines = open.filter((t) => t.kind === "deadline" && t.due_at && dayKey(t.due_at, tz) >= today && dayKey(t.due_at, tz) <= addDays(today, 7));
  if (deadlines.length) {
    out.push({
      id: "deadlines", certainty: "fact", tone: "attention",
      title: tr(deadlines.length === 1 ? "{n} deadline in the next 7 days" : "{n} deadlines in the next 7 days", { n: deadlines.length }),
      body: deadlines.map((t) => `${t.title} — ${fmt(t.due_at!, tz, { weekday: "short", day: "numeric", month: "short" }, lang)}`).join(" · "),
      sources: deadlines.map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/app/life?view=week",
    });
  }

  const waiting = actions.filter((a) => a.status === "waiting");
  if (waiting.length) {
    out.push({
      id: "waiting", certainty: "fact", tone: "info",
      title: tr(waiting.length === 1 ? "{n} action is waiting for you" : "{n} actions are waiting for you", { n: waiting.length }),
      body: tr("ONE prepared these, but they need your input or confirmation before they can move on."),
      sources: waiting.map((a) => ({ type: "action", id: a.id, title: a.title })), href: "/app/action",
    });
  }

  const missing = actions.filter((a) => a.status !== "done" && a.missing_info.length);
  if (missing.length) {
    out.push({
      id: "missing", certainty: "inference", tone: "info",
      title: tr("Missing information detected"),
      body: missing.slice(0, 3).map((a) => `${a.title}: ${a.missing_info.slice(0, 2).map((m) => tr(m)).join(", ")}`).join(" · "),
      sources: missing.map((a) => ({ type: "action", id: a.id, title: a.title })), href: "/app/action",
    });
  }

  const unscheduled = open.filter((t) => !t.due_at);
  if (unscheduled.length >= 5) {
    out.push({
      id: "unscheduled", certainty: "fact", tone: "info",
      title: tr("{n} open tasks have no date", { n: unscheduled.length }),
      body: tr("Giving the most important ones a date makes them show up in your day and week view."),
      sources: unscheduled.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/app/life?view=all",
    });
  }

  const docsNoSummary = memories.filter((m) => m.kind === "document" && !m.summary);
  if (docsNoSummary.length) {
    out.push({
      id: "summaries", certainty: "fact", tone: "info",
      title: tr(docsNoSummary.length === 1 ? "{n} document hasn't been summarised" : "{n} documents haven't been summarised", { n: docsNoSummary.length }),
      body: tr("Open them in Memory and create a summary so you can understand them at a glance later."),
      sources: docsNoSummary.slice(0, 5).map((m) => ({ type: "memory", id: m.id, title: m.title })), href: "/app/memory?kind=document",
    });
  }

  const untagged = memories.filter((m) => !m.tags.length && !m.category_id);
  if (untagged.length >= 3) {
    out.push({
      id: "untagged", certainty: "fact", tone: "info",
      title: tr("{n} memories are not organised yet", { n: untagged.length }),
      body: tr("Add a tag or category so related information connects automatically."),
      sources: untagged.slice(0, 5).map((m) => ({ type: "memory", id: m.id, title: m.title })), href: "/app/memory",
    });
  }

  const doneWeek = tasks.filter((t) => t.status === "done" && t.completed_at && Date.parse(t.completed_at) > now.getTime() - 7 * day);
  if (doneWeek.length) {
    out.push({
      id: "momentum", certainty: "fact", tone: "positive",
      title: tr(doneWeek.length === 1 ? "You completed {n} task this week" : "You completed {n} tasks this week", { n: doneWeek.length }),
      body: tr("Nice momentum. Keep going."),
      sources: doneWeek.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })),
    });
  }

  // Possibly related: a new entry that closely matches an older one (e.g. a letter about a stored contract).
  const { related } = await import("@/lib/ai/retrieval");
  const docsCorpus = memories.map((m) => ({ type: "memory" as const, id: m.id, title: m.title, text: m.content + " " + (m.summary ?? ""), tags: m.tags }));
  for (const m of memories.filter((x) => now.getTime() - Date.parse(x.created_at) < 14 * day).slice(0, 10)) {
    const older = docsCorpus.filter((d) => d.id !== m.id && Date.parse(memories.find((x) => x.id === d.id)!.created_at) < Date.parse(m.created_at));
    const hit = related({ type: "memory", id: m.id, title: m.title, text: m.content, tags: m.tags }, older, 1)[0];
    if (hit && hit.score >= 4) {
      out.push({ id: `rel-${m.id}`, tone: "info", certainty: "inference", title: tr("“{a}” may belong to “{b}”", { a: m.title, b: hit.doc.title }), body: tr("They share key terms. Check whether they are about the same matter."), sources: [{ type: "memory", id: m.id, title: m.title }, { type: "memory", id: hit.doc.id, title: hit.doc.title }] });
      break;
    }
  }

  const dueReminders = reminders.filter((r) => !r.done && Date.parse(r.remind_at) <= now.getTime());
  if (dueReminders.length) {
    out.push({
      id: "reminders", certainty: "fact", tone: "attention",
      title: tr(dueReminders.length === 1 ? "{n} reminder is due" : "{n} reminders are due", { n: dueReminders.length }),
      body: dueReminders.map((r) => r.title).slice(0, 3).join(" · "),
      sources: [], href: "/app/life?view=reminders",
    });
  }
  return out;
}

