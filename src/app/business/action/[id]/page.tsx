import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, FlaskConical, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { getT } from "@/lib/i18n/server";
import { actionLabel, BUSINESS_ACTION_TYPES } from "@/lib/ai/templates";
import { ACTION_STATUSES } from "@/lib/action-status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { ConfirmAction } from "@/components/ui/confirm";
import { DraftEditor } from "@/app/app/action/[id]/client";
import { businessActionForm, saveBusinessDraft, deleteBusinessAction } from "../../_actions/knowledge";
import { membersOf, nameOf } from "../../lib";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Action") };
}

export default async function BusinessActionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgPage("actions.use");
  const tr = await getT();
  const a = await ctx.db.get("action_items", id);
  if (!a) notFound();
  const [memory, members] = await Promise.all([a.memory_id ? ctx.db.get("memories", a.memory_id) : null, membersOf(ctx)]);
  const done = a.steps.filter((s) => s.done).length;
  const emoji = BUSINESS_ACTION_TYPES.find((t) => t.type === a.type)?.emoji;
  return (
    <div>
      <Link href="/business/action" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Action")}</Link>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted"><span aria-hidden>{emoji}</span> {tr(actionLabel(a.type))} · {tr("started by {name}", { name: nameOf(members, a.user_id) ?? "—" })}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">{a.title}</h1>
          {a.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[15px] text-muted">{a.description}</p>}
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl bg-fog p-1" role="group" aria-label={tr("Status")}>
          {ACTION_STATUSES.map((s) => (
            <form key={s.id} action={businessActionForm}>
              <input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="status" /><input type="hidden" name="status" value={s.id} />
              <button className={cn("rounded-xl px-3 py-1.5 text-[12.5px] transition", a.status === s.id ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:text-ink")} aria-pressed={a.status === s.id}>{tr(s.label)}</button>
            </form>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={tr("Next steps")} description={a.plan_source === "ai" ? tr("Plan created by ONE's AI — review before acting") : tr("Proven template for this kind of task")}
              action={a.plan_source === "template" ? <Badge tone="lavender"><FlaskConical /> {tr("Template")}</Badge> : <Badge tone="blue"><Sparkles /> {tr("AI plan")}</Badge>} />
            <CardBody>
              <div className="mb-4 flex items-center gap-3"><Progress value={a.steps.length ? (done / a.steps.length) * 100 : 0} /><span className="shrink-0 text-[12.5px] text-muted">{done}/{a.steps.length}</span></div>
              <ol className="space-y-1">
                {a.steps.map((s, i) => (
                  <li key={i}>
                    <form action={businessActionForm}>
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="op" value="step" /><input type="hidden" name="index" value={i} />
                      <button className="group flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-snow" aria-pressed={s.done}>
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold", s.done ? "border-mint-ink bg-mint-ink text-white" : "border-cloud text-accent group-hover:border-primary")}>{s.done ? "✓" : i + 1}</span>
                        <span className={cn("text-[14.5px] leading-snug text-ink", s.done && "text-muted line-through")}>{tr(s.text)}</span>
                      </button>
                    </form>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
          <DraftEditor id={a.id} draft={a.draft ?? ""} missing={a.missing_info.map((m) => tr(m))} action={saveBusinessDraft} />
        </div>
        <aside className="space-y-6">
          {a.missing_info.length > 0 && a.status !== "done" && (
            <Card className="border-[#ffe2cf]">
              <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-peach-ink" /> {tr("Missing information")}</span>} />
              <CardBody className="pt-3"><ul className="space-y-1.5">{a.missing_info.map((m) => <li key={m} className="rounded-lg bg-peach/70 px-3 py-2 text-[13px] text-peach-ink">{tr(m)}</li>)}</ul></CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> {tr("Your team stays in control")}</span>} />
            <CardBody className="pt-3"><p className="text-[13px] leading-relaxed text-muted">{tr("ONE never sends offers, emails or contracts on its own. Review the draft, send it from your own systems and set the status to “Waiting for a reply”.")}</p></CardBody>
          </Card>
          {memory && (
            <Card>
              <CardHeader title={tr("Based on")} />
              <CardBody className="pt-3"><Link href={`/business/memory/${memory.id}`} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[14px] text-ink hover:bg-snow"><BookOpen className="size-4 text-accent" /> <span className="truncate">{memory.title}</span></Link></CardBody>
            </Card>
          )}
          {(ctx.can("tasks.manage") || a.user_id === ctx.user.id) && <ConfirmAction action={deleteBusinessAction} fields={{ id: a.id }} trigger={tr("Delete action")} triggerVariant="ghost" danger title={tr("Delete this action?")} description={tr("The plan and draft will be permanently deleted.")} confirmLabel={tr("Delete")} />}
        </aside>
      </div>
    </div>
  );
}
