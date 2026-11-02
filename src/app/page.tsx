import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight, Brain, CalendarDays, Lock, ShieldCheck, Sparkles, Zap, Eye, Quote } from "lucide-react";
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
  ["Can I change my plan later?", "Of course. Start free, upgrade when ONE becomes part of your day, and downgrade whenever you like."],
];

export default async function Landing() {
  const tr = await getT();
  const user = await getCurrentUser();
  return (
    <div className="bg-white">
      <SiteHeader signedIn={!!user} />
      <main>
        {/* Hero */}
        <section className="bg-one-gradient relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-24 -z-0 size-[560px] -translate-x-1/2 rounded-full bg-sky/50 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-20 text-center sm:pt-28">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-sky bg-white/80 px-3.5 py-1.5 text-[12.5px] font-medium text-accent-strong shadow-soft">
              <span className="size-1.5 rounded-full bg-primary animate-pulse-soft" /> {tr("Your Personal Life Operating System")}
            </div>
            <h1 className="animate-fade-up mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[68px]" style={{ animationDelay: "60ms" }}>
              {tr("Remember everything.")}<br />
              <span className="text-gradient">{tr("Understand your life.")}</span><br />
              {tr("Get things done.")}
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "120ms" }}>
              {tr("ONE is the calm, private place for everything that matters in your life — and a personal assistant that understands it and helps you act on it.")}
            </p>
            <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
              <Link href={user ? "/app" : "/register"} className={buttonVariants({ size: "lg" })}>
                {user ? tr("Open ONE") : tr("Start for free")} <ArrowRight />
              </Link>
              <a href="#modules" className={buttonVariants({ variant: "secondary", size: "lg" })}>{tr("See how it works")}</a>
            </div>
            <p className="mt-4 text-[13px] text-muted">{tr("Free forever plan · No credit card required")}</p>
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
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-ink">{tr("Start free. Grow with ONE.")}</h2>
              <p className="mt-4 text-[16px] text-muted">{tr("Simple plans, cancel anytime.")}</p>
            </div>
            <div className="mt-14">
              <PlanCards />
            </div>
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
            <h2 className="text-4xl font-semibold tracking-tight text-ink">{tr("Give your life one calm place.")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] text-muted">{tr("Create your account in less than a minute. Free, private, and ready when you are.")}</p>
            <Link href={user ? "/app" : "/register"} className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
              {user ? tr("Open ONE") : tr("Create your free account")} <ArrowRight />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
