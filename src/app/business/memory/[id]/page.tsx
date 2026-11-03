import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Sparkles, Zap, FlaskConical, Building2, FolderKanban } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { canAnalyzeFile } from "@/lib/ai/service";
import { env } from "@/lib/config/env";
import { getT, getLocale } from "@/lib/i18n/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { ConfirmAction } from "@/components/ui/confirm";
import { KIND_ICON, KIND_LABEL } from "@/components/app/kind";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { BizTaskRow } from "@/components/business/task-row";
import { BizMemoryEditor } from "@/components/business/memory-ui";
import { SummaryButton, TaskDetector, RecognizeTextButton } from "@/app/app/memory/[id]/client";
import { summarizeKnowledge, detectBusinessTasks, addDetectedBusinessTasks, recognizeBusinessText, deleteKnowledge } from "../../_actions/knowledge";
import { membersOf, nameOf } from "../../lib";
import { formatBytes, formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Company memory") };
}

export default async function BizMemoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrgPage("memory.view");
  const tr = await getT();
  const locale = await getLocale();
  const m = await ctx.db.get("memories", id);
  if (!m) notFound();
  const [doc, clients, projects, linkedTasks, members] = await Promise.all([
    m.document_id ? ctx.db.get("documents", m.document_id) : null,
    ctx.db.select("clients", { order: { column: "name" } }),
    ctx.db.select("projects", { where: { status: "active" }, order: { column: "name" } }),
    ctx.db.select("tasks", { where: { source_memory_id: m.id } }),
    membersOf(ctx),
  ]);
  const I = KIND_ICON[m.kind];
  const own = m.user_id === ctx.user.id;
  const canEdit = ctx.can("memory.write") && (own || ctx.can("memory.delete_any"));
  const fileUrl = doc ? `/api/files/${doc.id}` : null;
  const client = clients.find((c) => c.id === m.client_id);
  const project = projects.find((p) => p.id === m.project_id);
  return (
    <div>
      <Link href="/business/memory" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Company memory")}</Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue"><I /> {tr(KIND_LABEL[m.kind])}</Badge>
                {client && <Link href={`/business/memory?client=${client.id}`}><Badge tone="outline"><Building2 /> {client.name}</Badge></Link>}
                {project && <Link href={`/business/projects/${project.id}`}><Badge tone="lavender"><FolderKanban /> {project.name}</Badge></Link>}
                {m.tags.map((t) => <Badge key={t} tone="gray">#{t}</Badge>)}
                <span className="ml-auto text-[12px] text-muted">{nameOf(members, m.user_id) ?? "—"} · {formatDate(m.created_at, undefined, locale)}</span>
              </div>
              <BizMemoryEditor memory={m} clients={clients.map((c) => ({ id: c.id, name: c.name }))} projects={projects.map((p) => ({ id: p.id, name: p.name }))} canEdit={canEdit} />
            </CardBody>
          </Card>
          {doc && (
            <Card>
              <CardHeader title={<span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-accent" /> <span className="truncate">{doc.file_name}</span></span>} description={`${doc.mime_type} · ${formatBytes(doc.size_bytes)}`}
                action={<a href={`${fileUrl}?download=1`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Download /> {tr("Download")}</a>} />
              <CardBody>
                {doc.mime_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl!} alt={m.title} className="max-h-[520px] w-full rounded-xl border border-line bg-snow object-contain" />
                ) : doc.mime_type === "application/pdf" ? <iframe src={fileUrl!} title={doc.file_name} className="h-[560px] w-full rounded-xl border border-line bg-snow" /> : null}
                {doc.extracted_text && (
                  <details className="mt-4 rounded-xl bg-snow p-4">
                    <summary className="cursor-pointer text-[13px] font-medium text-ink">{doc.extraction_method === "ai" ? tr("Text recognised by AI") : tr("Extracted text")}</summary>
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted">{doc.extracted_text.slice(0, 20000)}</pre>
                  </details>
                )}
                {ctx.can("memory.write") && canAnalyzeFile(ctx.ent, doc.mime_type, doc.size_bytes, doc.extraction_method === "parser" && !!doc.extracted_text) && <RecognizeTextButton id={m.id} again={doc.extraction_method === "ai"} action={recognizeBusinessText} />}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {tr("Summary")}</span>}
              description={m.summary_source === "extractive" ? tr("Quick summary — key sentences picked from your text (no AI)") : m.summary_source === "ai" ? tr("Created by ONE's AI from this item only") : undefined} />
            <CardBody className="space-y-3">
              {m.summary ? <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{m.summary}</p> : <p className="text-sm text-muted">{tr("No summary yet.")}</p>}
              {ctx.can("memory.write") && (!m.document_id || ctx.ent.has("documentAnalysis")
                ? <SummaryButton id={m.id} hasSummary={!!m.summary} willUseAi={env.aiMode === "anthropic"} action={summarizeKnowledge} />
                : <UpgradeCard plan="starter" title={tr("Intelligent document analysis")} text="Document analysis is not included in your current plan." />)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Tasks & deadlines")} description={tr("Turn contracts, offers and notes into assigned work.")} />
            <CardBody className="space-y-3">
              {linkedTasks.length > 0 && <div>{linkedTasks.map((t) => <BizTaskRow key={t.id} task={t} assignee={nameOf(members, t.assignee_id)} canToggle={ctx.can("tasks.manage") || t.assignee_id === ctx.user.id} />)}</div>}
              {ctx.can("tasks.create") && ctx.ent.has("taskExtraction") && <TaskDetector memoryId={m.id} aiDemo={env.aiMode === "demo"} detect={detectBusinessTasks} add={addDetectedBusinessTasks} addLabel="Add {n} to Tasks" />}
            </CardBody>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-2">
              {ctx.can("actions.use") && <Link href={`/business/action/new?memory=${m.id}`} className={buttonVariants({ className: "w-full" })}><Zap /> {tr("Start an action from this")}</Link>}
              {canEdit && (
                <ConfirmAction action={deleteKnowledge} fields={{ id: m.id }} trigger={tr("Delete")} triggerVariant="ghost" triggerSize="sm" danger
                  title={tr("Delete this entry?")} description={tr("It will be removed for the whole team.")} confirmLabel={tr("Delete permanently")} />
              )}
            </CardBody>
          </Card>
          {env.aiMode === "demo" && <Notice tone="lavender"><FlaskConical /> {tr("AI demo mode: summaries are extractive and task detection uses simple rules.")}</Notice>}
        </aside>
      </div>
    </div>
  );
}
