import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Brain, CheckCircle2, FlaskConical, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { actionLabel, ACTION_TYPES } from "@/lib/ai/templates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice, Progress } from "@/components/ui/misc";
import { ConfirmAction } from "@/components/ui/confirm";
import { setActionStatus, toggleStep, deleteAction, confirmExternal, regeneratePlan } from "../../_actions/action";
import { DraftEditor } from "./client";
import { cn, formatDateTime } from "@/lib/utils";
import { ACTION_STATUSES } from "@/lib/action-status";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Action") };
}

const STATUSES = ACTION_STATUSES;

export default async function ActionDetail({ params }: { params: Promise<{ id: string }> }) {
  const tr = await getT();
  const locale = await getLocale();
  const { id } = await params;
  const user = await requireUser();
  const db = await userDb(user.id);
  const a = await db.get("action_items", id);
  if (!a) notFound();
  const memory = a.memory_id ? await db.get("memories", a.memory_id) : null;
  const done = a.steps.filter((s) => s.done).length;
  const emoji = ACTION_TYPES.find((t) => t.type === a.type)?.emoji;

  return (
    <div>
      <Link href="/app/action" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Action")}</Link>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted"><span aria-hidden>{emoji}</span> {tr(actionLabel(a.type))}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">{a.title}</h1>
          {a.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[15px] text-muted">{a.description}</p>}
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl bg-fog p-1" role="group" aria-label={tr("Status")}>
          {STATUSES.map((s) => (
            <form key={s.id} action={setActionStatus}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="status" value={s.id} />
              <button className={cn("rounded-xl px-3 py-1.5 text-[12.5px] transition", a.status === s.id ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:text-ink")} aria-pressed={a.status === s.id}>
                {tr(s.label)}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={tr("Next steps")}
              description={a.plan_source === "ai" ? tr("Plan created by ONE's AI — review before acting") : tr("Proven template for this kind of task")}
              action={a.plan_source === "template" ? <Badge tone="lavender"><FlaskConical /> {tr("Template")}</Badge> : <Badge tone="blue"><Sparkles /> {tr("AI plan")}</Badge>}
            />
            <CardBody>
              <div className="mb-4 flex items-center gap-3">
                <Progress value={a.steps.length ? (done / a.steps.length) * 100 : 0} />
                <span className="shrink-0 text-[12.5px] text-muted">{done} of {a.steps.length}</span>
              </div>
              <ol className="space-y-1">
                {a.steps.map((s, i) => (
                  <li key={i}>
                    <form action={toggleStep}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="index" value={i} />
                      <button className="group flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-snow" aria-pressed={s.done}>
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition", s.done ? "border-mint-ink bg-mint-ink text-white" : "border-cloud text-accent group-hover:border-primary")}>
                          {s.done ? "✓" : i + 1}
                        </span>
                        <span className={cn("text-[14.5px] leading-snug text-ink", s.done && "text-muted line-through")}>{tr(s.text)}</span>
                      </button>
                    </form>
                  </li>
                ))}
              </ol>
              <div className="mt-4">
                <ConfirmAction action={regeneratePlan} fields={{ id: a.id }} trigger={tr("Refresh plan")} triggerVariant="ghost"
                  title={tr("Create a fresh plan?")} description={tr("Your current steps and their progress will be replaced. Your draft is kept unless a new one is generated.")} confirmLabel={tr("Refresh plan")} />
              </div>
            </CardBody>
          </Card>

          <DraftEditor id={a.id} draft={a.draft ?? ""} missing={a.missing_info.map((m) => tr(m))} />
        </div>

        <aside className="space-y-6">
          {a.missing_info.length > 0 && a.status !== "done" && (
            <Card className="border-[#ffe2cf]">
              <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle className="size-4 text-peach-ink" /> {tr("Missing information")}</span>} description={tr("ONE needs these before the draft is complete")} />
              <CardBody className="pt-3">
                <ul className="space-y-1.5">
                  {a.missing_info.map((m) => <li key={m} className="rounded-lg bg-peach/70 px-3 py-2 text-[13px] text-peach-ink">{tr(m)}</li>)}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> {tr("You stay in control")}</span>} />
            <CardBody className="space-y-3 pt-3">
              <p className="text-[13px] leading-relaxed text-muted">{tr("ONE never sends messages, cancels contracts or books anything on its own. Copy the draft, send it yourself, then confirm here.")}</p>
              {a.external_confirmed_at ? (
                <Notice tone="mint"><CheckCircle2 /> {tr("You confirmed completion on {date}.", { date: formatDateTime(a.external_confirmed_at, locale) })}</Notice>
              ) : (
                <ConfirmAction action={confirmExternal} fields={{ id: a.id }} trigger={tr("I've sent / completed this")} triggerVariant="primary" triggerSize="md"
                  title={tr("Confirm completion")} description={tr("Please confirm that you have reviewed everything and carried out this step yourself.")} confirmLabel={tr("Confirm")}>
                  <label className="flex items-start gap-2.5 rounded-xl bg-snow p-3 text-[13px] text-ink">
                    <input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-[#438ed4]" required />
                    {tr("I reviewed the content and sent / completed it myself. I understand ONE did not send anything on my behalf.")}
                  </label>
                </ConfirmAction>
              )}
            </CardBody>
          </Card>

          {memory && (
            <Card>
              <CardHeader title={tr("Based on")} />
              <CardBody className="pt-3">
                <Link href={`/app/memory/${memory.id}`} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[14px] text-ink hover:bg-snow"><Brain className="size-4 text-accent" /> <span className="truncate">{memory.title}</span></Link>
              </CardBody>
            </Card>
          )}

          <ConfirmAction action={deleteAction} fields={{ id: a.id }} trigger={tr("Delete action")} triggerVariant="ghost" danger title={tr("Delete this action?")} description={tr("The plan and draft will be permanently deleted.")} confirmLabel={tr("Delete")} />
        </aside>
      </div>
    </div>
  );
}
