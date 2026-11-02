import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, MessageCircle, Plus, AlertCircle, Info, TrendingUp, FlaskConical } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { computeInsights } from "@/lib/insights";
import { getTz } from "@/lib/tz";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SourceChips } from "@/components/app/source-chips";
import { ConfirmAction } from "@/components/ui/confirm";
import { deleteConversation } from "../_actions/ask";
import { Chat } from "./chat";
import { cn, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Intelligence" };

const TONE = {
  attention: { icon: AlertCircle, cls: "bg-peach/70 text-peach-ink" },
  info: { icon: Info, cls: "bg-mist text-accent-strong" },
  positive: { icon: TrendingUp, cls: "bg-mint text-mint-ink" },
};

export default async function IntelligencePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = await userDb(user.id);
  const tz = await getTz();
  const [insights, conversations] = await Promise.all([
    computeInsights(db, tz),
    db.select("ai_conversations", { order: { column: "updated_at", ascending: false }, limit: 30 }),
  ]);
  const active = sp.c ? conversations.find((c) => c.id === sp.c) : undefined;
  const messages = active ? await db.select("ai_messages", { where: { conversation_id: active.id }, order: { column: "created_at" } }) : [];

  return (
    <div>
      <PageHeader title="Intelligence" description="ONE connects your information and shows what needs attention — always with the sources behind it." />

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink"><Sparkles className="size-4 text-primary" /> Insights</h2>
        {insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cloud bg-snow/60 px-6 py-10 text-center text-sm text-muted">
            No insights yet. As you add tasks, deadlines, documents and actions, ONE will highlight what matters.
          </div>
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
                        <p className="text-[15px] font-semibold text-ink">{i.title}</p>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{i.body}</p>
                        <SourceChips sources={i.sources} />
                        {i.href && <Link href={i.href} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong hover:underline">Review <ArrowRight className="size-3.5" /></Link>}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">Insights are computed with transparent rules from your own data — no guessing.</p>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink"><MessageCircle className="size-4 text-primary" /> Ask ONE</h2>
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-1">
            <CardHeader title="Conversations" action={<Link href="/app/intelligence" className="rounded-lg p-1.5 text-accent hover:bg-mist" aria-label="New conversation"><Plus className="size-4" /></Link>} />
            <CardBody className="space-y-0.5 px-3 pt-3">
              {conversations.length === 0 && <p className="px-2 text-sm text-muted">No conversations yet.</p>}
              {conversations.map((c) => (
                <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl", active?.id === c.id ? "bg-mist" : "hover:bg-snow")}>
                  <Link href={`/app/intelligence?c=${c.id}`} className="min-w-0 flex-1 px-2.5 py-2">
                    <span className="block truncate text-[13.5px] text-ink">{c.title}</span>
                    <span className="block text-[11.5px] text-muted">{relativeTime(c.updated_at)}</span>
                  </Link>
                  <div className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <ConfirmAction action={deleteConversation} fields={{ id: c.id }} trigger="×" triggerVariant="ghost" danger title="Delete conversation?" confirmLabel="Delete" />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <div className="lg:col-span-3">
            {env.aiMode === "demo" && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-dashed border-[#e2dcff] bg-lavender/60 px-3.5 py-2.5 text-[13px] text-lavender-ink">
                <FlaskConical className="size-4 shrink-0" /> Demo mode: no AI model is connected. ONE answers with a keyword search over your stored items and never invents anything.
              </div>
            )}
            <Chat
              key={active?.id ?? "new"}
              conversationId={active?.id}
              messages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content, sources: m.sources, mode: m.mode }))}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
