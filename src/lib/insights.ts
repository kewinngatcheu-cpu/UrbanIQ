import "server-only";
import type { UserDb } from "@/lib/db";
import type { Source } from "@/lib/db/types";
import { dayKey, addDays, fmt } from "@/lib/tz";

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
}

const day = 24 * 3600 * 1000;

export async function computeInsights(db: UserDb, tz = "UTC", now = new Date()): Promise<Insight[]> {
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
      id: "overdue", tone: "attention",
      title: `${overdue.length} overdue ${overdue.length === 1 ? "item" : "items"}`,
      body: "These were due before today. Reschedule them or mark them done to keep your plan realistic.",
      sources: overdue.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/app/life?view=all",
    });
  }

  const deadlines = open.filter((t) => t.kind === "deadline" && t.due_at && dayKey(t.due_at, tz) >= today && dayKey(t.due_at, tz) <= addDays(today, 7));
  if (deadlines.length) {
    out.push({
      id: "deadlines", tone: "attention",
      title: `${deadlines.length} ${deadlines.length === 1 ? "deadline" : "deadlines"} in the next 7 days`,
      body: deadlines.map((t) => `${t.title} — ${fmt(t.due_at!, tz, { weekday: "short", day: "numeric", month: "short" })}`).join(" · "),
      sources: deadlines.map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/app/life?view=week",
    });
  }

  const waiting = actions.filter((a) => a.status === "waiting");
  if (waiting.length) {
    out.push({
      id: "waiting", tone: "info",
      title: `${waiting.length} ${waiting.length === 1 ? "action is" : "actions are"} waiting for you`,
      body: "ONE prepared these, but they need your input or confirmation before they can move on.",
      sources: waiting.map((a) => ({ type: "action", id: a.id, title: a.title })), href: "/app/action",
    });
  }

  const missing = actions.filter((a) => a.status !== "done" && a.missing_info.length);
  if (missing.length) {
    out.push({
      id: "missing", tone: "info",
      title: "Missing information detected",
      body: missing.slice(0, 3).map((a) => `${a.title}: ${a.missing_info.slice(0, 2).join(", ")}`).join(" · "),
      sources: missing.map((a) => ({ type: "action", id: a.id, title: a.title })), href: "/app/action",
    });
  }

  const unscheduled = open.filter((t) => !t.due_at);
  if (unscheduled.length >= 5) {
    out.push({
      id: "unscheduled", tone: "info",
      title: `${unscheduled.length} open tasks have no date`,
      body: "Giving the most important ones a date makes them show up in your day and week view.",
      sources: unscheduled.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })), href: "/app/life?view=all",
    });
  }

  const docsNoSummary = memories.filter((m) => m.kind === "document" && !m.summary);
  if (docsNoSummary.length) {
    out.push({
      id: "summaries", tone: "info",
      title: `${docsNoSummary.length} ${docsNoSummary.length === 1 ? "document hasn't" : "documents haven't"} been summarised`,
      body: "Open them in Memory and create a summary so you can understand them at a glance later.",
      sources: docsNoSummary.slice(0, 5).map((m) => ({ type: "memory", id: m.id, title: m.title })), href: "/app/memory?kind=document",
    });
  }

  const untagged = memories.filter((m) => !m.tags.length && !m.category_id);
  if (untagged.length >= 3) {
    out.push({
      id: "untagged", tone: "info",
      title: `${untagged.length} memories are not organised yet`,
      body: "Add a tag or category so related information connects automatically.",
      sources: untagged.slice(0, 5).map((m) => ({ type: "memory", id: m.id, title: m.title })), href: "/app/memory",
    });
  }

  const doneWeek = tasks.filter((t) => t.status === "done" && t.completed_at && Date.parse(t.completed_at) > now.getTime() - 7 * day);
  if (doneWeek.length) {
    out.push({
      id: "momentum", tone: "positive",
      title: `You completed ${doneWeek.length} ${doneWeek.length === 1 ? "task" : "tasks"} this week`,
      body: "Nice momentum. Keep going.",
      sources: doneWeek.slice(0, 5).map((t) => ({ type: "task", id: t.id, title: t.title })),
    });
  }

  const dueReminders = reminders.filter((r) => !r.done && Date.parse(r.remind_at) <= now.getTime());
  if (dueReminders.length) {
    out.push({
      id: "reminders", tone: "attention",
      title: `${dueReminders.length} ${dueReminders.length === 1 ? "reminder is" : "reminders are"} due`,
      body: dueReminders.map((r) => r.title).slice(0, 3).join(" · "),
      sources: [], href: "/app/life?view=reminders",
    });
  }
  return out;
}

