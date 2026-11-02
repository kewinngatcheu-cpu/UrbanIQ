import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Link2, Pin, PinOff, Sparkles, Zap, FlaskConical, Mic } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { buildCorpus, canAnalyzeFile } from "@/lib/ai/service";
import { related } from "@/lib/ai/retrieval";
import { hasFeature } from "@/lib/permissions/entitlements";
import { env } from "@/lib/config/env";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { ConfirmAction } from "@/components/ui/confirm";
import { KIND_ICON, KIND_LABEL } from "@/components/app/kind";
import { TaskRow } from "@/components/app/task-row";
import { UpgradeCard } from "@/components/app/upgrade-card";
import { deleteMemory, togglePin } from "../../_actions/memory";
import { formatBytes, formatDate, sourceHref } from "@/lib/utils";
import { MemoryEditor, SummaryButton, TaskDetector, RecognizeTextButton } from "./client";

export const metadata: Metadata = { title: "Memory" };

export default async function MemoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = await userDb(user.id);
  const m = await db.get("memories", id);
  if (!m) notFound();
  const [doc, categories, linkedTasks, linkedActions, corpus] = await Promise.all([
    m.document_id ? db.get("documents", m.document_id) : null,
    db.select("categories", { order: { column: "name" } }),
    db.select("tasks", { where: { source_memory_id: m.id } }),
    db.select("action_items", { where: { memory_id: m.id } }),
    buildCorpus(db),
  ]);
  const self = corpus.find((d) => d.type === "memory" && d.id === m.id)!;
  const rel = related(self, corpus.filter((d) => d.type === "memory" || d.type === "action"), 5);
  const I = KIND_ICON[m.kind];
  const cat = categories.find((c) => c.id === m.category_id);
  const canAnalyze = !m.document_id || hasFeature(user, "documentAnalysis");
  const canExtract = hasFeature(user, "taskExtraction");
  const fileUrl = doc ? `/api/files/${doc.id}` : null;

  return (
    <div>
      <Link href="/app/memory" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Memory</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue"><I /> {KIND_LABEL[m.kind]}</Badge>
                {cat && <Badge tone="outline"><span className="size-1.5 rounded-full" style={{ background: cat.color }} /> {cat.name}</Badge>}
                {m.tags.map((t) => <Link key={t} href={`/app/memory?tag=${encodeURIComponent(t)}`}><Badge tone="gray">#{t}</Badge></Link>)}
                <span className="ml-auto text-[12px] text-muted">Saved {formatDate(m.created_at)}</span>
              </div>
              <MemoryEditor memory={m} categories={categories} />
            </CardBody>
          </Card>

          {doc && (
            <Card>
              <CardHeader
                title={<span className="flex items-center gap-2"><FileText className="size-4 text-accent" /> {doc.file_name}</span>}
                description={`${doc.mime_type} · ${formatBytes(doc.size_bytes)}`}
                action={<a href={`${fileUrl}?download=1`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Download /> Download</a>}
              />
              <CardBody>
                {doc.mime_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl!} alt={m.title} className="max-h-[520px] w-full rounded-xl border border-line bg-snow object-contain" />
                ) : doc.mime_type === "application/pdf" ? (
                  <iframe src={fileUrl!} title={doc.file_name} className="h-[560px] w-full rounded-xl border border-line bg-snow" />
                ) : doc.mime_type.startsWith("audio/") ? (
                  <div className="space-y-3">
                    <audio controls src={fileUrl!} className="w-full" />
                    <Notice tone="lavender"><Mic /> Voice transcription is coming soon. Your recording is stored safely and will become searchable once transcription launches.</Notice>
                  </div>
                ) : null}
                {doc.extracted_text ? (
                  <details className="mt-4 rounded-xl bg-snow p-4" open={!doc.mime_type.startsWith("image/") && doc.mime_type !== "application/pdf"}>
                    <summary className="cursor-pointer text-[13px] font-medium text-ink">
                      {doc.extraction_method === "ai" ? "Text recognised by AI" : "Extracted text"} ({doc.extracted_text.length.toLocaleString()} characters)
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted">{doc.extracted_text.slice(0, 20000)}</pre>
                  </details>
                ) : doc.extraction_status === "failed" ? (
                  <p className="mt-3 text-xs text-rose-ink">ONE couldn&apos;t read the text of this file. It&apos;s still stored safely.</p>
                ) : null}
                {canAnalyzeFile(user, doc.mime_type, doc.size_bytes, doc.extraction_method === "parser" && !!doc.extracted_text) ? (
                  <RecognizeTextButton id={m.id} again={doc.extraction_method === "ai"} />
                ) : (doc.mime_type.startsWith("image/") || (doc.mime_type === "application/pdf" && !doc.extracted_text)) && !doc.mime_type.startsWith("audio/") ? (
                  <p className="mt-3 text-xs text-muted">
                    {env.aiMode === "demo"
                      ? "Text recognition needs ONE's AI, which isn't connected in demo mode. Add a note above so you can find this file by search."
                      : !hasFeature(user, "documentAnalysis")
                        ? "Text recognition for images and scanned PDFs is part of Premium."
                        : "This file is too large or in a format ONE's AI can't read yet."}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Summary</span>}
              description={m.summary_source === "extractive" ? "Quick summary — key sentences picked from your text (no AI)" : m.summary_source === "ai" ? "Created by ONE's AI from this item only" : undefined} />
            <CardBody className="space-y-3">
              {m.summary ? <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{m.summary}</p> : <p className="text-sm text-muted">No summary yet.</p>}
              {canAnalyze ? (
                <SummaryButton id={m.id} hasSummary={!!m.summary} willUseAi={env.aiMode === "anthropic" && hasFeature(user, "advancedSummaries")} />
              ) : (
                <UpgradeCard plan="premium" title="Intelligent document analysis" text="Summaries of uploaded documents are part of Premium." />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tasks & deadlines" description="Turn what's in here into things to do." />
            <CardBody className="space-y-3">
              {linkedTasks.length > 0 && <div>{linkedTasks.map((t) => <TaskRow key={t.id} task={t} compact />)}</div>}
              {canExtract ? (
                <TaskDetector memoryId={m.id} aiDemo={env.aiMode === "demo"} />
              ) : (
                <UpgradeCard plan="premium" title="Automatic task & deadline detection" text="ONE can find tasks and deadlines in your notes and documents with Premium." />
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-2">
              <Link href={`/app/action/new?memory=${m.id}`} className={buttonVariants({ className: "w-full" })}><Zap /> Create an action from this</Link>
              <form action={togglePin}>
                <input type="hidden" name="id" value={m.id} />
                <Button variant="secondary" className="w-full">{m.pinned ? <><PinOff /> Unpin</> : <><Pin /> Pin to top</>}</Button>
              </form>
              <div className="pt-1">
                <ConfirmAction action={deleteMemory} fields={{ id: m.id }} trigger="Delete" triggerVariant="ghost" triggerSize="sm" danger
                  title="Delete this memory?" description={doc ? "The memory and its file will be permanently deleted." : "This memory will be permanently deleted."} confirmLabel="Delete permanently" />
              </div>
            </CardBody>
          </Card>

          {linkedActions.length > 0 && (
            <Card>
              <CardHeader title="Linked actions" />
              <CardBody className="space-y-1 pt-3">
                {linkedActions.map((a) => (
                  <Link key={a.id} href={`/app/action/${a.id}`} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[14px] text-ink hover:bg-snow"><Zap className="size-4 text-lavender-ink" /> <span className="truncate">{a.title}</span></Link>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Link2 className="size-4 text-accent" /> Related</span>} description="Connected by shared tags and keywords" />
            <CardBody className="space-y-1 pt-3">
              {rel.length === 0 ? (
                <p className="text-sm text-muted">Nothing related yet. Tags help ONE connect things.</p>
              ) : rel.map(({ doc: d }) => (
                <Link key={`${d.type}-${d.id}`} href={sourceHref(d)} className="block rounded-xl px-2 py-2 hover:bg-snow">
                  <span className="block truncate text-[14px] font-medium text-ink">{d.title}</span>
                  <span className="block truncate text-[12px] text-muted">{d.type === "action" ? "Action" : "Memory"} · {d.text.replace(/\s+/g, " ").slice(0, 80)}</span>
                </Link>
              ))}
            </CardBody>
          </Card>
          {env.aiMode === "demo" && (
            <Notice tone="lavender"><FlaskConical /> AI demo mode: summaries are extractive and task detection uses simple rules.</Notice>
          )}
        </aside>
      </div>
    </div>
  );
}
