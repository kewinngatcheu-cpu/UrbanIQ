import { statusInfo } from "@/lib/action-status";
import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, Brain, CalendarDays, Sparkles, Zap, PartyPopper, Megaphone } from "lucide-react";
import { KIND_ICON } from "@/components/app/kind";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { PLANS } from "@/lib/config/plans";
import { getUsage, personalEnt, personalSubject } from "@/lib/permissions/entitlements";
import { computeInsights } from "@/lib/insights";
import { getFlags } from "@/lib/features";
import { getTz, dayKey, fmt, hourIn } from "@/lib/tz";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice, Progress } from "@/components/ui/misc";
import { Composer } from "@/components/app/composer";
import { TaskRow } from "@/components/app/task-row";
import { relativeTime } from "@/lib/utils";
import { actionLabel } from "@/lib/ai/templates";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Home") };
}


export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string; upgraded?: string }> }) {
  const tr = await getT();
  const locale = await getLocale();
  const sp = await searchParams;
  const user = await requireUser();
  const tz = await getTz();
  const db = await userDb(user.id);
  const [tasks, memories, actions, reminders, usage, insights, flags] = await Promise.all([
    db.select("tasks", { where: { status: "open" } }),
    db.select("memories", { order: { column: "created_at", ascending: false }, limit: 5 }),
    db.select("action_items", { order: { column: "updated_at", ascending: false } }),
    db.select("reminders", { where: { done: false }, order: { column: "remind_at" } }),
    getUsage(personalSubject(user)),
    computeInsights(db, tz, tr, locale),
    getFlags(),
  ]);

  const today = dayKey(new Date(), tz);
  const todays = tasks
    .filter((t) => t.due_at && dayKey(t.due_at, tz) <= today)
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  const upcoming = tasks.filter((t) => t.due_at && dayKey(t.due_at, tz) > today).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!)).slice(0, 4);
  const anytime = tasks.filter((t) => !t.due_at).slice(0, 3);
  const activeActions = actions.filter((a) => a.status !== "done").slice(0, 4);
  const hour = hourIn(tz);
  const greeting = hour < 5 ? tr("Good night") : hour < 12 ? tr("Good morning") : hour < 18 ? tr("Good afternoon") : tr("Good evening");
  const first = user.full_name?.split(" ")[0];
  const plan = (await personalEnt(user)).plan;
  const usedPct = (usage.aiRequests / plan.limits.aiRequestsPerMonth) * 100;

  return (
    <div className="space-y-8">
      {sp.welcome && (
        <Notice tone="mint"><PartyPopper /> {first ? tr("Welcome to ONE, {name}! Start by telling ONE something you want to remember — or ask it anything.", { name: first }) : tr("Welcome to ONE! Start by telling ONE something you want to remember — or ask it anything.")}</Notice>
      )}
      {sp.upgraded && (
        <Notice tone="mint"><Sparkles /> {tr("Your {plan} plan is active. Enjoy the full ONE experience.", { plan: PLANS[user.plan].name })}</Notice>
      )}
      {flags.announcement_banner && (
        <Notice tone="lavender"><Megaphone />{tr("New in ONE: smarter insights on the Intelligence page show exactly which of your items they're based on.")}</Notice>
      )}

      <section className="relative">
        <div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-64 w-[80%] -translate-x-1/2 rounded-full bg-sky/40 blur-3xl" />
        <p className="text-[13px] font-medium text-muted">{fmt(new Date(), tz, { weekday: "long", day: "numeric", month: "long" }, locale)}</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-tight tracking-tight text-ink sm:text-[38px]">
          {greeting}{first ? `, ${first}` : ""}.
        </h1>
        <p className="mt-1 text-[16px] text-muted">{tr("What would you like to get done today?")}</p>
        <div className="mt-6"><Composer aiDemo={env.aiMode === "demo"} /></div>
      </section>

      {/* Status strip */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Due today", value: todays.length, href: "/app/life", icon: CalendarDays, tone: "text-accent bg-mist" },
          { label: "Open actions", value: activeActions.length, href: "/app/action", icon: Zap, tone: "text-lavender-ink bg-lavender" },
          { label: "Reminders", value: reminders.filter((r) => Date.parse(r.remind_at) <= Date.now() + 86400000).length, href: "/app/life?view=reminders", icon: Bell, tone: "text-peach-ink bg-peach" },
          { label: "Memories", value: (await db.count("memories")), href: "/app/memory", icon: Brain, tone: "text-mint-ink bg-mint" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className={`flex size-10 items-center justify-center rounded-xl ${s.tone}`}><s.icon className="size-[18px]" /></span>
            <span>
              <span className="block text-xl font-semibold leading-none text-ink">{s.value}</span>
              <span className="mt-1 block text-[12.5px] text-muted">{tr(s.label)}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title={tr("Your day")} description={todays.length ? tr(todays.length === 1 ? "{n} thing on your plate" : "{n} things on your plate", { n: todays.length }) : tr("Nothing due today")} action={<Link href="/app/life" className="text-[13px] font-medium text-accent-strong hover:underline">{tr("Open Life")}</Link>} />
            <CardBody className="pt-3">
              {todays.length === 0 && upcoming.length === 0 && anytime.length === 0 ? (
                <EmptyState icon={<CalendarDays />} title={tr("A clear day")} description={tr("Add a task from the input above, or plan your week in Life.")} />
              ) : (
                <div className="space-y-4">
                  {todays.length > 0 && <div>{todays.map((t) => <TaskRow key={t.id} task={t} />)}</div>}
                  {upcoming.length > 0 && (
                    <div>
                      <p className="px-2 pb-1 text-[11.5px] font-semibold uppercase tracking-wider text-muted">{tr("Coming up")}</p>
                      {upcoming.map((t) => <TaskRow key={t.id} task={t} compact />)}
                    </div>
                  )}
                  {anytime.length > 0 && (
                    <div>
                      <p className="px-2 pb-1 text-[11.5px] font-semibold uppercase tracking-wider text-muted">{tr("Anytime")}</p>
                      {anytime.map((t) => <TaskRow key={t.id} task={t} compact />)}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tr("Recently saved")} action={<Link href="/app/memory" className="text-[13px] font-medium text-accent-strong hover:underline">{tr("All memories")}</Link>} />
            <CardBody className="pt-3">
              {memories.length === 0 ? (
                <EmptyState icon={<Brain />} title={tr("Your memory is empty")} description={tr("Switch the input above to “Remember” and save your first thought.")} />
              ) : (
                <ul className="divide-y divide-line/70">
                  {memories.map((m) => {
                    const I = KIND_ICON[m.kind];
                    return (
                      <li key={m.id}>
                        <Link href={`/app/memory/${m.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-snow">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-mist text-accent"><I className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-ink">{m.title}</span>
                            <span className="block truncate text-[12.5px] text-muted">{m.summary ?? m.content.slice(0, 120) ?? ""}</span>
                          </span>
                          <span className="shrink-0 text-[12px] text-muted">{relativeTime(m.created_at, undefined, locale)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {tr("Suggestions")}</span>} description={tr("Based on your own data")} action={<Link href="/app/intelligence" className="text-[13px] font-medium text-accent-strong hover:underline">{tr("More")}</Link>} />
            <CardBody className="space-y-3 pt-3">
              {insights.length === 0 ? (
                <p className="rounded-xl bg-snow px-4 py-5 text-center text-sm text-muted">{tr("No suggestions right now. As you add tasks, documents and actions, ONE will point out what needs attention.")}</p>
              ) : (
                insights.slice(0, 3).map((i) => (
                  <div key={i.id} className={`rounded-xl px-4 py-3 ${i.tone === "attention" ? "bg-peach/70" : i.tone === "positive" ? "bg-mint/70" : "bg-snow"}`}>
                    <p className="text-[13.5px] font-semibold text-ink">{i.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{i.body}</p>
                    {i.href && <Link href={i.href} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-strong hover:underline">{tr("Review")} <ArrowRight className="size-3" /></Link>}
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tr("Current actions")} action={<Link href="/app/action" className="text-[13px] font-medium text-accent-strong hover:underline">{tr("Action")}</Link>} />
            <CardBody className="pt-3">
              {activeActions.length === 0 ? (
                <div className="rounded-xl bg-snow px-4 py-5 text-center">
                  <p className="text-sm text-muted">{tr("Need to cancel, complain or organise something?")}</p>
                  <Link href="/app/action/new" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline">{tr("Start an action")} <ArrowRight className="size-3" /></Link>
                </div>
              ) : (
                <ul className="space-y-1">
                  {activeActions.map((a) => {
                    const done = a.steps.filter((s) => s.done).length;
                    return (
                      <li key={a.id}>
                        <Link href={`/app/action/${a.id}`} className="block rounded-xl px-2 py-2.5 transition hover:bg-snow">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[14px] font-medium text-ink">{a.title}</span>
                            <Badge tone={statusInfo(a.status).tone}>{tr(statusInfo(a.status).label)}</Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={a.steps.length ? (done / a.steps.length) * 100 : 0} />
                            <span className="shrink-0 text-[11.5px] text-muted">{done}/{a.steps.length}</span>
                          </div>
                          <p className="mt-1 text-[11.5px] text-muted">{tr(actionLabel(a.type))}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {reminders.length > 0 && (
            <Card>
              <CardHeader title={tr("Reminders")} />
              <CardBody className="space-y-2 pt-3">
                {reminders.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                    <Bell className={`size-4 ${Date.parse(r.remind_at) <= Date.now() ? "text-peach-ink" : "text-muted"}`} />
                    <span className="flex-1 truncate text-[14px] text-ink">{r.title}</span>
                    <span className="text-[12px] text-muted">{fmt(r.remind_at, tz, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, locale)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <div className="rounded-2xl border border-line bg-snow/70 p-4">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-ink">{tr("{plan} plan", { plan: plan.name })}</span>
              <span className="text-muted">{tr("{used} / {limit} AI requests", { used: usage.aiRequests, limit: plan.limits.aiRequestsPerMonth })}</span>
            </div>
            <Progress value={usedPct} className="mt-2" />
            {user.plan !== "exclusive" && (
              <Link href="/app/settings/billing" className="mt-2 inline-block text-[12.5px] font-medium text-accent-strong hover:underline">{tr("Compare plans")}</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
