import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Search, Upload, Plus, X, Building2, FolderKanban } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { search } from "@/lib/ai/retrieval";
import { getFlags } from "@/lib/features";
import { getT, getLocale } from "@/lib/i18n/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { NewMemoryDialog } from "@/components/app/memory-dialog";
import { UploadDialog } from "@/components/app/upload-dialog";
import { KIND_ICON, KIND_LABEL } from "@/components/app/kind";
import { LinkFields, ClientDialog } from "@/components/business/memory-ui";
import { createKnowledge, uploadBusinessDocument } from "../_actions/knowledge";
import { deleteClient } from "../_actions/work";
import { cn, relativeTime } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Company memory") };
}

const KINDS = [{ value: "info", label: "Company information" }, { value: "note", label: "Note" }, { value: "idea", label: "Idea" }, { value: "goal", label: "Company goal" }];
const FILTERS = [["", "All"], ["document", "Documents"], ["info", "Information"], ["note", "Notes"], ["idea", "Ideas"], ["goal", "Goals"], ["image", "Images"]] as const;

type SP = { q?: string; kind?: string; client?: string; project?: string; view?: string };
function href(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/business/memory${s ? `?${s}` : ""}`;
}

export default async function BusinessMemory({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireOrgPage("memory.view");
  const tr = await getT();
  const locale = await getLocale();
  const [all, docs, clients, projects, flags] = await Promise.all([
    ctx.db.select("memories", { order: { column: "created_at", ascending: false } }),
    ctx.db.select("documents"),
    ctx.db.select("clients", { order: { column: "name" } }),
    ctx.db.select("projects", { where: { status: "active" }, order: { column: "name" } }),
    getFlags(),
  ]);
  const opts = { clients: clients.map((c) => ({ id: c.id, name: c.name })), projects: projects.map((p) => ({ id: p.id, name: p.name })) };
  const canWrite = ctx.can("memory.write");

  if (sp.view === "clients") {
    return (
      <div>
        <PageHeader title={tr("Clients")} description={tr("The people and companies you work for.")} actions={ctx.can("clients.manage") ? <ClientDialog /> : undefined} />
        <Tabs sp={sp} tr={tr} />
        {clients.length === 0 ? <EmptyState icon={<Building2 />} title={tr("No clients yet")} description={tr("Add a client to link documents and projects to them.")} /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => {
              const n = all.filter((m) => m.client_id === c.id).length;
              const pn = projects.filter((p) => p.client_id === c.id).length;
              return (
                <div key={c.id} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Building2 className="size-4 text-accent" /> {c.name}</p>
                  {c.contact && <p className="mt-1 truncate text-[13px] text-muted">{c.contact}</p>}
                  {c.notes && <p className="mt-2 line-clamp-3 text-[13px] text-muted">{c.notes}</p>}
                  <div className="mt-4 flex items-center gap-3 text-[12.5px]">
                    <Link href={href({}, { client: c.id })} className="text-accent-strong hover:underline">{tr("{n} entries", { n })}</Link>
                    <span className="text-muted">{tr("{n} projects", { n: pn })}</span>
                    {ctx.can("clients.manage") && <span className="ml-auto"><ConfirmAction action={deleteClient} fields={{ id: c.id }} trigger={tr("Remove")} triggerVariant="ghost" triggerSize="sm" danger title={tr("Remove this client?")} description={tr("Linked documents and projects stay — they are just no longer assigned to this client.")} confirmLabel={tr("Remove")} /></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const docText = new Map(docs.map((d) => [d.id, d.extracted_text ?? ""]));
  let items = all;
  if (sp.kind) items = items.filter((m) => m.kind === sp.kind);
  if (sp.client) items = items.filter((m) => m.client_id === sp.client);
  if (sp.project) items = items.filter((m) => m.project_id === sp.project);
  const q = sp.q?.trim();
  if (q) {
    const ranked = search(items.map((m) => ({ type: "memory" as const, id: m.id, title: m.title, tags: m.tags, text: `${m.content} ${m.summary ?? ""} ${m.document_id ? docText.get(m.document_id) : ""}`, m })), q, 200).map((r) => r.doc.m);
    const lower = q.toLowerCase();
    items = [...ranked, ...items.filter((m) => !ranked.includes(m) && (m.title.toLowerCase().includes(lower) || m.content.toLowerCase().includes(lower)))];
  }
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const extra = <LinkFields {...opts} client={sp.client} project={sp.project} />;

  return (
    <div>
      <PageHeader title={tr("Company memory")} description={tr("Your company's knowledge — documents, contracts, client information and processes.")}
        actions={canWrite ? (
          <>
            {flags.document_uploads && <UploadDialog action={uploadBusinessDocument} basePath="/business/memory" extra={extra} trigger={<span className={buttonVariants({ variant: "secondary" })}><Upload /> {tr("Upload")}</span>} />}
            <NewMemoryDialog categories={[]} action={createKnowledge} basePath="/business/memory" extra={extra} kinds={KINDS} triggerLabel="New entry" triggerIcon={<Plus />} />
          </>
        ) : undefined} />
      <Tabs sp={sp} tr={tr} />
      <form className="relative mb-4" action="/business/memory">
        {sp.client && <input type="hidden" name="client" value={sp.client} />}
        {sp.project && <input type="hidden" name="project" value={sp.project} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={sp.q} aria-label={tr("Search company memory")} placeholder={tr("Search titles, notes and document text")}
          className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] shadow-soft placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-sky/70" />
      </form>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(([id, label]) => (
          <Link key={id} href={href(sp, { kind: id || undefined })} className={cn("rounded-full px-3 py-1.5 text-[13px] transition", (sp.kind ?? "") === id ? "bg-ink text-white" : "bg-fog text-muted hover:text-ink")}>{tr(label)}</Link>
        ))}
      </div>
      {(clients.length > 0 || projects.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {clients.map((c) => <Link key={c.id} href={href(sp, { client: sp.client === c.id ? undefined : c.id })} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", sp.client === c.id ? "border-primary bg-mist text-ink" : "border-line text-muted hover:text-ink")}><Building2 className="size-3" /> {c.name}</Link>)}
          {projects.map((p) => <Link key={p.id} href={href(sp, { project: sp.project === p.id ? undefined : p.id })} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", sp.project === p.id ? "border-primary bg-mist text-ink" : "border-line text-muted hover:text-ink")}><FolderKanban className="size-3" /> {p.name}</Link>)}
        </div>
      )}
      {(q || sp.client || sp.project) && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted">{tr(items.length === 1 ? "{n} result" : "{n} results", { n: items.length })}
          <Link href="/business/memory" className="inline-flex items-center gap-1 text-accent-strong hover:underline"><X className="size-3" /> {tr("Clear")}</Link></p>
      )}
      {items.length === 0 ? (
        <EmptyState icon={<BookOpen />} title={all.length ? tr("Nothing found") : tr("Build your company knowledge")} description={all.length ? tr("Try another search term or filter.") : tr("Upload contracts, offers and invoices or write down how things work. Everyone on the team can find it.")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => {
            const I = KIND_ICON[m.kind];
            return (
              <Link key={m.id} href={`/business/memory/${m.id}`} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-cloud hover:shadow-lift">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted"><I className="size-3.5 text-accent" /> {tr(KIND_LABEL[m.kind])}</span>
                <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold text-ink">{m.title}</h3>
                <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">{m.summary ?? m.content}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {m.client_id && clientName.get(m.client_id) && <Badge tone="outline"><Building2 /> {clientName.get(m.client_id)}</Badge>}
                  {m.project_id && projectName.get(m.project_id) && <Badge tone="blue"><FolderKanban /> {projectName.get(m.project_id)}</Badge>}
                  <span className="ml-auto text-[11.5px] text-muted">{relativeTime(m.created_at, undefined, locale)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tabs({ sp, tr }: { sp: SP; tr: (s: string) => string }) {
  const clients = sp.view === "clients";
  return (
    <div className="mb-5 flex gap-1 rounded-2xl bg-fog p-1 text-[13px] sm:w-fit">
      <Link href="/business/memory" className={cn("rounded-xl px-3.5 py-2", !clients ? "bg-white font-medium text-ink shadow-soft" : "text-muted")}>{tr("Knowledge")}</Link>
      <Link href="/business/memory?view=clients" className={cn("rounded-xl px-3.5 py-2", clients ? "bg-white font-medium text-ink shadow-soft" : "text-muted")}>{tr("Clients")}</Link>
    </div>
  );
}
