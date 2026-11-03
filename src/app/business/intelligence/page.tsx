import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, MessageCircle, Plus, AlertCircle, Info, TrendingUp, FlaskConical } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { env } from "@/lib/config/env";
import { getTz } from "@/lib/tz";
import { getT, getLocale } from "@/lib/i18n/server";
import { computeBusinessInsights } from "@/lib/business-insights";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SourceChips } from "@/components/app/source-chips";
import { Certainty } from "@/components/app/certainty";
import { ConfirmAction } from "@/components/ui/confirm";
import { Chat } from "@/app/app/intelligence/chat";
import { askBusiness, deleteBusinessConversation } from "../_actions/knowledge";
import { membersOf } from "../lib";
import { cn, relativeTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Business intelligence") };
}

const TONE = {
  attention: { icon: AlertCircle, cls: "bg-peach/70 text-peach-ink" },
  info: { icon: Info, cls: "bg-mist text-accent-strong" },
  positive: { icon: TrendingUp, cls: "bg-mint text-mint-ink" },
};
const SUGGESTIONS = ["Which deadlines are coming up?", "Which projects are behind schedule?", "What is still open for our clients?", "Which tasks have no owner?"];

export default async function BusinessIntelligence({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrgPage("intelligence.view");
  const tr = await getT();
  const locale = await getLocale();
  const tz = await getTz();
  const members = await membersOf(ctx);
  const [insights, allConversations] = await Promise.all([
    computeBusinessInsights(ctx.db, new Map(members.map((m) => [m.user_id, m.name])), tz, tr, locale),
    ctx.db.select("ai_conversations", { order: { column: "updated_at", ascending: false }, limit: 200 }),
  ]);
  // Conversations are private to the member who asked them.
  const conversations = allConversations.filter((c) => c.user_id === ctx.user.id).slice(0, 30);
  const active = sp.c ? conversations.find((c) => c.id === sp.c) : undefined;
  const messages = active ? await ctx.db.select("ai_messages", { where: { conversation_id: active.id }, order: { column: "created_at" } }) : [];
  return (
    <div>
      <PageHeader title={tr("Business intelligence")} description={tr("Risks, bottlenecks and priorities across projects, clients and documents — with the sources behind every statement.")} />
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink"><Sparkles className="size-4 text-primary" /> {tr("Analysis")}</h2>
        {insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cloud bg-snow/60 px-6 py-10 text-center text-sm text-muted">{tr("Nothing needs attention right now. As your team adds projects, tasks and documents, ONE highlights risks and priorities here.")}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((i) => {
              const T = TONE[i.tone];
              return (
                <Card key={i.id}>
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", T.cls)}><T.icon className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="text-[15px] font-semibold text-ink">{i.title}</p><Certainty value={i.certainty} /></div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{i.body}</p>
                        <SourceChips sources={i.sources} world="business" />
                        {i.href && <Link href={i.href} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline">{tr("Review")} <ArrowRight className="size-3.5" /></Link>}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">{tr("“Confirmed” = stated in your company data. “Conclusion” = inferred by ONE from patterns — please verify before acting.")}</p>
      </section>
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink"><MessageCircle className="size-4 text-primary" /> {tr("Ask ONE Business")}</h2>
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-1">
            <CardHeader title={tr("Your conversations")} action={<Link href="/business/intelligence" className="rounded-lg p-1.5 text-accent hover:bg-mist" aria-label={tr("New conversation")}><Plus className="size-4" /></Link>} />
            <CardBody className="space-y-0.5 px-3 pt-3">
              {conversations.length === 0 && <p className="px-2 text-sm text-muted">{tr("No conversations yet.")}</p>}
              {conversations.map((c) => (
                <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl", active?.id === c.id ? "bg-mist" : "hover:bg-snow")}>
                  <Link href={`/business/intelligence?c=${c.id}`} className="min-w-0 flex-1 px-2.5 py-2">
                    <span className="block truncate text-[13.5px] text-ink">{c.title}</span>
                    <span className="block text-[11.5px] text-muted">{relativeTime(c.updated_at, undefined, locale)}</span>
                  </Link>
                  <div className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <ConfirmAction action={deleteBusinessConversation} fields={{ id: c.id }} trigger="×" triggerVariant="ghost" danger title={tr("Delete conversation?")} confirmLabel={tr("Delete")} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <div className="min-w-0 lg:col-span-3">
            {env.aiMode === "demo" && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-dashed border-[#e2dcff] bg-lavender/60 px-3.5 py-2.5 text-[13px] text-lavender-ink">
                <FlaskConical className="size-4 shrink-0" /> {tr("Demo mode: no AI model is connected. ONE answers with a keyword search over your company's stored items and never invents anything.")}
              </div>
            )}
            <Chat key={active?.id ?? "new"} conversationId={active?.id} askAction={askBusiness} basePath="/business/intelligence" suggestions={SUGGESTIONS}
              messages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content, sources: m.sources, mode: m.mode }))} />
          </div>
        </div>
      </section>
    </div>
  );
}
