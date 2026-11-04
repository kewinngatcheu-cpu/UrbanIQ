import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { env } from "@/lib/config/env";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/misc";
import { BUSINESS_ACTION_TYPES } from "@/lib/ai/templates";
import { NewActionForm } from "@/app/app/action/new/form";
import { createBusinessAction } from "../../_actions/knowledge";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("New action") };
}

export default async function NewBusinessAction({ searchParams }: { searchParams: Promise<{ type?: string; memory?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrgPage("actions.use");
  const tr = await getT();
  const memories = await ctx.db.select("memories", { order: { column: "created_at", ascending: false }, limit: 200 });
  const preset = sp.memory ? memories.find((m) => m.id === sp.memory) : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/business/action" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {tr("Action")}</Link>
      <PageHeader title={tr("Which business process should ONE prepare?")} description={tr("ONE prepares the steps and drafts. Nothing is sent without your team.")} />
      <NewActionForm types={BUSINESS_ACTION_TYPES} action={createBusinessAction} fallbackType={preset ? "analyze_document" : "follow_up"} initialType={sp.type}
        memories={memories.map((m) => ({ id: m.id, title: m.title }))} presetMemory={preset ? { id: preset.id, title: preset.title } : undefined} aiDemo={env.aiMode === "demo"} />
    </div>
  );
}
