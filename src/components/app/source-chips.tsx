"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { Brain, CheckSquare, FileText, Zap } from "lucide-react";
import type { Source } from "@/lib/db/types";
import { sourceHref } from "@/lib/utils";

const ICON = { memory: Brain, task: CheckSquare, action: Zap, document: FileText };

export function SourceChips({ sources, numbered, world = "personal" }: { sources: Source[]; numbered?: boolean; world?: "personal" | "business" }) {
  const tr = useT();
  if (!sources.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{tr("Based on")}</span>
      {sources.map((s, i) => {
        const I = ICON[s.type];
        return (
          <Link key={`${s.type}-${s.id}`} href={sourceHref(s, world)} className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[12px] text-ink shadow-soft transition hover:border-cloud hover:text-accent-strong">
            {numbered && <span className="text-[10px] font-semibold text-accent-strong">{i + 1}</span>}
            <I className="size-3 shrink-0 text-muted" />
            <span className="truncate">{s.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
