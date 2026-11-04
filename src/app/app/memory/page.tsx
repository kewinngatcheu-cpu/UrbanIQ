import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Pin, Search, Upload, Plus, X } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { search } from "@/lib/ai/retrieval";
import { getFlags } from "@/lib/features";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { NewMemoryDialog } from "@/components/app/memory-dialog";
import { UploadDialog } from "@/components/app/upload-dialog";
import { KIND_ICON, KIND_LABEL } from "@/components/app/kind";
import { cn, relativeTime } from "@/lib/utils";
import type { Memory } from "@/lib/db/types";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Memory") };
}

const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "All" },
  { id: "note", label: "Notes" },
  { id: "idea", label: "Ideas" },
  { id: "info", label: "Important" },
  { id: "goal", label: "Goals" },
  { id: "document", label: "Documents" },
  { id: "image", label: "Images" },
  { id: "voice", label: "Voice" },
];

type SP = { q?: string; kind?: string; tag?: string; cat?: string; sort?: string };

function href(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  const next = { ...sp, ...patch };
  for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
  const s = p.toString();
  return `/app/memory${s ? `?${s}` : ""}`;
}

export default async function MemoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const tr = await getT();
  const locale = await getLocale();
  const sp = await searchParams;
  const user = await requireUser();
  const db = await userDb(user.id);
  const [all, categories, docs, flags] = await Promise.all([
    db.select("memories", { order: { column: "created_at", ascending: sp.sort === "oldest" } }),
    db.select("categories", { order: { column: "name" } }),
    db.select("documents"),
    getFlags(),
  ]);
  const docText = new Map(docs.map((d) => [d.id, d.extracted_text ?? ""]));

  let items: Memory[] = all;
  if (sp.kind) items = items.filter((m) => m.kind === sp.kind);
  if (sp.tag) items = items.filter((m) => m.tags.includes(sp.tag!));
  if (sp.cat) items = items.filter((m) => m.category_id === sp.cat);
  const q = sp.q?.trim();
  if (q) {
    const lower = q.toLowerCase();
    const ranked = search(
      items.map((m) => ({ type: "memory" as const, id: m.id, title: m.title, tags: m.tags, text: `${m.content} ${m.summary ?? ""} ${m.document_id ? docText.get(m.document_id) : ""}`, m })),
      q, 200,
    ).map((r) => r.doc.m);
    const substring = items.filter((m) => !ranked.includes(m) && (m.title.toLowerCase().includes(lower) || m.content.toLowerCase().includes(lower)));
    items = [...ranked, ...substring];
  } else {
    items = [...items.filter((m) => m.pinned), ...items.filter((m) => !m.pinned)];
  }
  const tags = [...new Set(all.flatMap((m) => m.tags))].sort().slice(0, 30);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div>
      <PageHeader
        title={tr("Memory")}
        description={tr("Everything you want to remember — searchable, connected and always yours.")}
        actions={
          <>
            {flags.document_uploads && <UploadDialog trigger={<span className={buttonVariants({ variant: "secondary" })}><Upload /> {tr("Upload")}</span>} />}
            <NewMemoryDialog categories={categories} triggerIcon={<Plus />} />
          </>
        }
      />

      <form className="relative mb-4" action="/app/memory">
        {sp.kind && <input type="hidden" name="kind" value={sp.kind} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={sp.q}
          placeholder={tr("Search your memory — titles, notes and document text")}
          className="h-12 w-full rounded-2xl border border-line bg-white pl-11 pr-4 text-[15px] shadow-soft placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-sky/70"
          aria-label={tr("Search memory")}
        />
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <Link key={f.id} href={href(sp, { kind: f.id || undefined })}
            className={cn("rounded-full px-3 py-1.5 text-[13px] transition", (sp.kind ?? "") === f.id ? "bg-ink text-white" : "bg-fog text-muted hover:text-ink")}>
            {tr(f.label)}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <Link href={href(sp, { sort: sp.sort === "oldest" ? undefined : "oldest" })} className="rounded-full px-3 py-1.5 text-[13px] text-muted hover:text-ink">
          {sp.sort === "oldest" ? tr("Oldest first") : tr("Newest first")}
        </Link>
      </div>
      {(tags.length > 0 || categories.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <Link key={c.id} href={href(sp, { cat: sp.cat === c.id ? undefined : c.id })}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition", sp.cat === c.id ? "border-primary bg-mist text-ink" : "border-line text-muted hover:text-ink")}>
              <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.name}
            </Link>
          ))}
          {tags.map((t) => (
            <Link key={t} href={href(sp, { tag: sp.tag === t ? undefined : t })}
              className={cn("rounded-full px-2.5 py-1 text-[12px] transition", sp.tag === t ? "bg-accent text-white" : "bg-mist text-accent-strong hover:bg-sky")}>
              #{t}
            </Link>
          ))}
        </div>
      )}

      {(q || sp.tag || sp.cat) && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted">
          {tr(items.length === 1 ? "{n} result" : "{n} results", { n: items.length })}
          <Link href="/app/memory" className="inline-flex items-center gap-1 text-accent-strong hover:underline"><X className="size-3" /> {tr("Clear")}</Link>
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Brain />}
          title={all.length ? tr("Nothing found") : tr("Start your memory")}
          description={all.length ? tr("Try another search term or filter.") : tr("Save notes, ideas and documents. ONE keeps them safe and finds them when you need them.")}
          action={!all.length ? <NewMemoryDialog categories={categories} triggerLabel={tr("Save your first memory")} /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => {
            const I = KIND_ICON[m.kind];
            const cat = m.category_id ? catMap.get(m.category_id) : null;
            return (
              <Link key={m.id} href={`/app/memory/${m.id}`} className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-cloud hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted"><I className="size-3.5 text-accent" /> {tr(KIND_LABEL[m.kind])}</span>
                  {m.pinned && <Pin className="size-3.5 text-accent" aria-label={tr("Pinned")} />}
                </div>
                <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold text-ink">{m.title}</h3>
                <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">{m.summary ?? (m.content || (m.document_id ? "Document" : ""))}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {cat && <Badge tone="outline"><span className="size-1.5 rounded-full" style={{ background: cat.color }} /> {cat.name}</Badge>}
                  {m.tags.slice(0, 3).map((t) => <Badge key={t}>#{t}</Badge>)}
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
