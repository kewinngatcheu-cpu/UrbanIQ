import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckSquare, FolderKanban, Sparkles, Users, Zap, AlertCircle, Building2 } from "lucide-react";
import { requireOrg } from "@/lib/org";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { getTz, dayKey, addDays, fmt, hourIn } from "@/lib/tz";
import { getT, getLocale } from "@/lib/i18n/server";
import { computeBusinessInsights } from "@/lib/business-insights";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Notice, Progress } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Composer } from "@/components/app/composer";
import { Certainty } from "@/components/app/certainty";
import { SourceChips } from "@/components/app/source-chips";
import { BizTaskRow } from "@/components/business/task-row";
import { askBusiness, quickCaptureBusiness } from "./_actions/knowledge";
import { membersOf, nameOf } from "./lib";
import { relativeTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Business dashboard") };
}

export default async function BusinessDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string; upgraded?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const tr = await getT();
  const locale = await getLocale();
  const tz = await getTz();
  const [tasks, projects, actions, members, activity] = await Promise.all([
    ctx.db.select("tasks"),
    ctx.db.select("projects", { where: { status: "active" } }),
    ctx.db.select("action_items"),
    membersOf(ctx),
    systemDb().select("org_activity", { where: { org_id: ctx.org.id }, order: { column: "created_at", ascending: false }, limit: 8 }),
  ]);
  const names = new Map(members.map((m) => [m.user_id, m.name]));
  const insights = await computeBusinessInsights(ctx.db, names, tz, tr, locale);
  const today = dayKey(new Date(), tz);
  const open = tasks.filter((t) => t.status === "open");
  const mine = open.filter((t) => t.assignee_id === ctx.user.id).sort((a, b) => (a.due_at ?? "9") < (b.due_at ?? "9") ? -1 : 1);
  const overdue = open.filter((t) => t.due_at && dayKey(t.due_at, tz) < today);
  const upcoming = open.filter((t) => t.due_at && dayKey(t.due_at, tz) >= today && dayKey(t.due_at, tz) <= addDays(today, 14) && t.kind === "deadline");
  const openActions = actions.filter((a) => a.status !== "done");
  const hour = hourIn(tz);
  const greeting = tr(hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const canToggle = (t: (typeof tasks)[number]) => ctx.can("tasks.manage") || (ctx.can("tasks.update_own") && (t.assignee_id === ctx.user.id || t.user_id === ctx.user.id));
  const modes = [
    ...(ctx.can("intelligence.view") ? (["ask"] as const) : []),
    ...(ctx.can("memory.write") ? (["remember"] as const) : []),
    ...(ctx.can("tasks.create") ? (["task"] as const) : []),
  ];

  return (
    <div className="space-y-7">
      {sp.welcome && <Notice tone="mint"><Building2 /> {tr("Your company workspace is ready. Invite your team and add your first project.")}</Notice>}
      {sp.upgraded && <Notice tone="mint"><Sparkles /> {tr("{plan} is active for {company}.", { plan: ctx.ent.plan.name, company: ctx.org.name })}</Notice>}

      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted">{fmt(new Date(), tz, { weekday: "long", day: "numeric", month: "long" }, locale)} · {ctx.org.name}</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">{greeting}{ctx.user.full_name ? `, ${ctx.user.full_name.split(" ")[0]}` : ""}.</h1>
          <p className="mt-1 text-[15px] text-muted">{tr("Here is what needs attention in your company.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{ctx.ent.plan.name}</Badge>
          <Badge tone="gray"><Users /> {tr("{n} members", { n: members.length })}</Badge>
        </div>
      </section>

      <Composer aiDemo={env.aiMode === "demo"} askAction={askBusiness} captureAction={quickCaptureBusiness} chatBase="/business/intelligence"
        placeholderAsk={tr("Ask about projects, deadlines, clients or documents…")} modes={[...modes]} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "My open tasks", value: mine.length, href: "/business/tasks?filter=mine", icon: CheckSquare, tone: "text-accent bg-mist" },
          { label: "Overdue", value: overdue.length, href: "/business/tasks?filter=overdue", icon: AlertCircle, tone: overdue.length ? "text-rose-ink bg-rose" : "text-muted bg-fog" },
          { label: "Active projects", value: projects.length, href: "/business/projects", icon: FolderKanban, tone: "text-lavender-ink bg-lavender" },
          { label: "Open actions", value: openActions.length, href: "/business/action", icon: Zap, tone: "text-mint-ink bg-mint" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${s.tone}`}><s.icon className="size-[18px]" /></span>
            <span className="min-w-0"><span className="block text-xl font-semibold leading-none text-ink tabular-nums">{s.value}</span><span className="mt-1 block truncate text-[12.5px] text-muted">{tr(s.label)}</span></span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <CardHeader title={tr("My tasks")} description={mine.length ? tr("{n} open, sorted by due date", { n: mine.length }) : undefined} action={<Link href="/business/tasks" className="text-[13px] font-medium text-accent-strong hover:underline">{tr("All tasks")}</Link>} />
            <CardBody className="pt-3">
              {mine.length === 0 ? <EmptyState icon={<CheckSquare />} title={tr("Nothing assigned to you")} description={tr("New tasks assigned to you show up here.")} /> :
                mine.slice(0, 7).map((t) => <BizTaskRow key={t.id} task={t} project={t.project_id ? projectName.get(t.project_id) : null} canToggle={canToggle(t)} />)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Projects")} action={<Link href="/business/projects" className="text-[13px] font-medium text-accent-strong hover:underline">{tr("All projects")}</Link>} />
            <CardBody className="space-y-3 pt-3">
              {projects.length === 0 ? <EmptyState icon={<FolderKanban />} title={tr("No projects yet")} description={tr("Group tasks, documents and people around a goal.")} /> :
                projects.slice(0, 5).map((p) => {
                  const pt = tasks.filter((t) => t.project_id === p.id && !t.parent_id);
                  const done = pt.filter((t) => t.status === "done").length;
                  return (
                    <Link key={p.id} href={`/business/projects/${p.id}`} className="block rounded-xl px-2 py-2 hover:bg-snow">
                      <div className="flex items-center justify-between gap-3"><span className="truncate text-[14px] font-medium text-ink">{p.name}</span><span className="shrink-0 text-[12px] text-muted">{nameOf(members, p.lead_id) ?? tr("No lead")}</span></div>
                      <div className="mt-2 flex items-center gap-2"><Progress value={pt.length ? (done / pt.length) * 100 : 0} /><span className="shrink-0 text-[11.5px] text-muted tabular-nums">{done}/{pt.length}</span></div>
                    </Link>
                  );
                })}
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {tr("Recommendations")}</span>} description={tr("Based on your company's data")} />
            <CardBody className="space-y-3 pt-3">
              {insights.length === 0 ? <p className="rounded-xl bg-snow px-4 py-5 text-center text-sm text-muted">{tr("Nothing needs attention right now.")}</p> :
                insights.slice(0, 4).map((i) => (
                  <div key={i.id} className={`rounded-xl px-4 py-3 ${i.tone === "attention" ? "bg-peach/70" : i.tone === "positive" ? "bg-mint/70" : "bg-snow"}`}>
                    <div className="flex items-start justify-between gap-2"><p className="text-[13.5px] font-semibold text-ink">{i.title}</p><Certainty value={i.certainty} /></div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{i.body}</p>
                    <SourceChips sources={i.sources} world="business" />
                    {i.href && <Link href={i.href} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-strong hover:underline">{tr("Review")} <ArrowRight className="size-3" /></Link>}
                  </div>
                ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><CalendarClock className="size-4 text-peach-ink" /> {tr("Upcoming deadlines")}</span>} description={tr("Next 14 days")} />
            <CardBody className="pt-3">
              {upcoming.length === 0 ? <p className="text-sm text-muted">{tr("No deadlines in the next 14 days.")}</p> :
                upcoming.slice(0, 6).map((t) => <BizTaskRow key={t.id} task={t} assignee={nameOf(members, t.assignee_id)} canToggle={canToggle(t)} />)}
            </CardBody>
          </Card>
          {ctx.can("activity.view") && (
            <Card>
              <CardHeader title={tr("Team activity")} />
              <CardBody className="pt-3">
                {activity.length === 0 ? <p className="text-sm text-muted">{tr("No activity yet.")}</p> : (
                  <ul className="space-y-2.5">
                    {activity.map((a) => (
                      <li key={a.id} className="flex gap-2.5 text-[13px]">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="min-w-0 flex-1"><span className="font-medium text-ink">{names.get(a.actor_id) ?? "—"}</span> <span className="text-muted">· {a.summary}</span></span>
                        <span className="shrink-0 text-[11.5px] text-muted">{relativeTime(a.created_at, undefined, locale)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
