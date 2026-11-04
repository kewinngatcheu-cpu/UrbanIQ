import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight, Brain, CalendarDays, Lock, ShieldCheck, Sparkles, Zap, Eye, Quote, User, Building2, Check } from "lucide-react";
import { isOwner } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/landing/site-header";
import { PlanCards } from "@/components/landing/plan-cards";
import { ProductPreview } from "@/components/landing/product-preview";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const MODULES = [
  { icon: Brain, name: "Memory", color: "bg-mist text-accent", title: "Remember everything", text: "Notes, ideas, documents, PDFs and images — saved once, found instantly. ONE answers questions about what you stored, and only from what you stored." },
  { icon: Zap, name: "Action", color: "bg-lavender text-lavender-ink", title: "Get things done", text: "Cancel a contract, file a complaint, understand an invoice, plan a move. ONE prepares the steps and drafts — you stay in control and confirm." },
  { icon: CalendarDays, name: "Life", color: "bg-mint text-mint-ink", title: "Stay organised", text: "Tasks, appointments, deadlines, reminders, goals and projects in a calm day and week view — with your own categories." },
  { icon: Sparkles, name: "Intelligence", color: "bg-peach text-peach-ink", title: "Understand your life", text: "ONE connects the dots: deadlines hidden in documents, missing information, next steps — always showing what each insight is based on." },
];

const FAQ = [
  ["What exactly is ONE?", "ONE is a personal life operating system: a private memory for everything important, an organiser for your tasks and deadlines, and an AI assistant that turns information into concrete next steps."],
  ["Can ONE invent things about me?", "No. When ONE answers questions about your life, it only uses information you have stored and shows its sources. If nothing is stored, it tells you so."],
  ["Does ONE send emails or cancel contracts on its own?", "Never. ONE prepares drafts and checklists. Anything binding — sending, booking, cancelling — only happens after your explicit confirmation, and you do it yourself."],
  ["Who can see my data?", "Only you. Every record is tied to your account and protected by row-level security. Even the platform operator cannot read your memories or documents without a transparent, logged support grant from you."],
  ["Can I export or delete my data?", "Yes, at any time. Export everything as a JSON file or delete your account and all its data from Settings."],
  ["What is the difference between ONE Personal and ONE Business?", "They are two separate products. ONE Personal organises your own life. ONE Business is a company workspace with team members, roles, projects, clients and company knowledge. You choose one when you register — data from the two worlds is never mixed."],
  ["How much does ONE Business cost?", "The business plans Starter, Growth and Scale are being finalised. Every company starts with a free trial, and nothing is charged before prices are published and you choose a plan."],
  ["Can I change my plan later?", "Of course. Start free, upgrade when ONE becomes part of your day, and downgrade whenever you like."],
];

export default async function Landing() {
  const tr = await getT();
  const user = await getCurrentUser();
  const home = user ? (isOwner(user) ? "/admin" : user.account_type === "business" ? "/business" : "/app") : null;
  const WORLDS = [
    { id: "personal", icon: User, badge: "ONE PERSONAL", title: "Your personal life, organized.", text: "Memory, Action, Life and Intelligence for everything private: documents, deadlines, appointments, goals and the things you need to get done.",
      points: ["Private memory for notes, documents and ideas", "Tasks, deadlines and appointments in one calm view", "Help with letters, contracts and applications", "Insights that show what they are based on"], cls: "border-sky bg-gradient-to-br from-white to-mist/70", icon_cls: "bg-mist text-accent" },
    { id: "business", icon: Building2, badge: "ONE BUSINESS", title: "Your business, under control.", text: "A company workspace for your team: projects, tasks, clients, documents and processes — with roles and permissions checked on the server.",
      points: ["Projects with owners, tasks, sub-tasks and history", "Team members with roles from Owner to Viewer", "Company knowledge: contracts, offers, invoices", "Risks, bottlenecks and deadlines at a glance"], cls: "border-line bg-gradient-to-br from-white to-fog", icon_cls: "bg-ink text-white" },
  ] as const;
  return (
    <div className="bg-white">
      <SiteHeader signedIn={!!user} />
      <main>
        {/* Hero */}
        <section className="bg-one-gradient relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-24 -z-0 size-[560px] -translate-x-1/2 rounded-full bg-sky/50 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-20 text-center sm:pt-28">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-sky bg-white/80 px-3.5 py-1.5 text-[12.5px] font-medium text-accent-strong shadow-soft">
              <span className="size-1.5 rounded-full bg-primary animate-pulse-soft" /> {tr("ONE Personal & ONE Business")}
            </div>
            <h1 className="animate-fade-up mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[68px]" style={{ animationDelay: "60ms" }}>
              {tr("Your Life. Your Business.")}<br />
              <span className="text-gradient">{tr("One Intelligent System.")}</span>
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "120ms" }}>
              {tr("ONE organises what matters — privately in ONE Personal, as a team in ONE Business. It remembers, understands and helps you act, and always shows what it is based on.")}
            </p>
            <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
              {home ? (
                <Link href={home} className={buttonVariants({ size: "lg" })}>{tr("Open ONE")} <ArrowRight /></Link>
              ) : (
                <>
                  <Link href="/register?world=personal" className={buttonVariants({ size: "lg" })}><User /> {tr("Start ONE Personal")}</Link>
                  <Link href="/register?world=business" className={buttonVariants({ variant: "secondary", size: "lg" })}><Building2 /> {tr("Start ONE Business")}</Link>
                </>
              )}
            </div>
            <p className="mt-4 text-[13px] text-muted">{tr("Personal: free forever plan · Business: free trial · No credit card required")}</p>
          </div>
          <div id="preview" className="relative px-5 pb-24">
            <ProductPreview />
          </div>
        </section>

        {/* Principles */}
        <section className="border-y border-line bg-snow/70">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-3">
            {[
              ["REMEMBER", "Important information never gets lost again."],
              ["UNDERSTAND", "Information is connected and made understandable."],
              ["ACT", "Information becomes clear next steps — and done tasks."],
            ].map(([k, v], i) => (
              <div key={k} className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-accent shadow-soft">{i + 1}</span>
                <div>
                  <p className="text-[12px] font-semibold tracking-[0.18em] text-accent-strong">{tr(k)}</p>
                  <p className="mt-1 text-[15px] text-ink">{tr(v)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modules */}
        <section id="worlds" className="mx-auto max-w-6xl px-5 pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold tracking-[0.18em] text-accent-strong">{tr("TWO WORLDS")}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{tr("One system. Two separate worlds.")}</h2>
            <p className="mt-4 text-[16px] text-muted">{tr("Choose ONE Personal for your life or ONE Business for your company. Each has its own data, its own features and its own plans.")}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {WORLDS.map((w) => (
              <div key={w.id} className={cn("flex flex-col rounded-[1.75rem] border p-8 shadow-soft", w.cls)}>
                <span className={cn("flex size-12 items-center justify-center rounded-2xl", w.icon_cls)}><w.icon className="size-5" /></span>
                <p className="mt-5 text-[12px] font-semibold tracking-[0.16em] text-accent-strong">{w.badge}</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{tr(w.title)}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{tr(w.text)}</p>
                <ul className="mt-5 flex-1 space-y-2">{w.points.map((pt) => <li key={pt} className="flex gap-2 text-[14px] text-ink"><Check className="mt-0.5 size-4 shrink-0 text-accent" /> {tr(pt)}</li>)}</ul>
                {!home && <Link href={`/register?world=${w.id}`} className={cn(buttonVariants({ variant: w.id === "business" ? "secondary" : "primary" }), "mt-7 w-full sm:w-auto")}>{w.id === "business" ? tr("Start ONE Business") : tr("Start ONE Personal")} <ArrowRight /></Link>}
              </div>
            ))}
          </div>
        </section>

        <section id="modules" className="mx-auto max-w-6xl px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold tracking-[0.18em] text-accent-strong">{tr("FOUR MODULES · ONE PLACE")}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{tr("Everything your life needs, beautifully connected.")}</h2>
            <p className="mt-4 text-[16px] text-muted">{tr("No more scattered notes, forgotten deadlines and documents you can never find. ONE brings it together — and helps you move forward.")}</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {MODULES.map((m) => (
              <div key={m.name} className="group rounded-3xl border border-line bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className={cn("flex size-11 items-center justify-center rounded-2xl", m.color)}>
                  <m.icon className="size-5" />
                </div>
                <p className="mt-5 text-[12px] font-semibold tracking-[0.16em] text-muted">{m.name.toUpperCase()}</p>
                <h3 className="mt-1 text-xl font-semibold text-ink">{tr(m.title)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{tr(m.text)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="bg-one-gradient border-y border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.18em] text-accent-strong">{tr("PRIVATE BY DESIGN")}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{tr("Your life belongs to you.")}</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">{tr("ONE is built so that trust is not a promise but an architecture decision.")}</p>
            </div>
            <div className="grid gap-4">
              {[
                [Lock, "Strict data separation", "Every record belongs to exactly one account, enforced in the database with row-level security."],
                [Eye, "No silent access", "Not even the operator reads your memories. Support access requires your explicit, time-limited and logged consent."],
                [ShieldCheck, "Grounded answers", "ONE cites the stored items behind every answer and says clearly when it doesn't know."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Lock;
                return (
                  <div key={t as string} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist text-accent"><I className="size-5" /></div>
                    <div>
                      <p className="font-semibold text-ink">{tr(t as string)}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{tr(d as string)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quote */}
        <section className="mx-auto max-w-3xl px-5 py-20 text-center">
          <Quote className="mx-auto size-8 text-cloud" />
          <p className="mt-4 text-2xl font-medium leading-snug tracking-tight text-ink">{tr("“Every person deserves a calm place for their life — and a companion that helps them keep track of it.”")}</p>
          <p className="mt-4 text-sm text-muted">{tr("The idea behind ONE")}</p>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-line bg-snow/60">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[13px] font-semibold tracking-[0.18em] text-accent-strong">{tr("PRICING")}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{tr("Simple plans for both worlds.")}</h2>
              <p className="mt-4 text-[16px] text-muted">{tr("Monthly, cancel anytime.")}</p>
            </div>
            <h3 className="mb-5 mt-14 flex items-center gap-2 text-[18px] font-semibold text-ink"><User className="size-5 text-accent" /> ONE Personal</h3>
            <PlanCards world="personal" />
            <h3 className="mb-2 mt-16 flex items-center gap-2 text-[18px] font-semibold text-ink"><Building2 className="size-5 text-accent" /> ONE Business</h3>
            <p className="mb-5 text-[14px] text-muted">{tr("Business prices are being finalised. Start with a free trial — nothing is charged without your explicit choice.")}</p>
            <PlanCards world="business" />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
          <h2 className="text-center text-4xl font-semibold tracking-tight text-ink">{tr("Questions & answers")}</h2>
          <div className="mt-12 divide-y divide-line rounded-3xl border border-line bg-white shadow-soft">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                  {tr(q)}
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mist text-accent transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{tr(a)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-24">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-sky bg-gradient-to-br from-mist via-white to-sky/60 px-8 py-16 text-center shadow-soft">
            <h2 className="text-4xl font-semibold tracking-tight text-ink">{tr("Your Life. Your Business. One Intelligent System.")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] text-muted">{tr("Create your account in less than a minute — for yourself or for your company.")}</p>
            <Link href={home ?? "/register"} className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
              {home ? tr("Open ONE") : tr("Get started")} <ArrowRight />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
