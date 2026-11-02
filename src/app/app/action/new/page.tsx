import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { userDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { PageHeader } from "@/components/ui/misc";
import { NewActionForm } from "./form";

export const metadata: Metadata = { title: "New action" };

export default async function NewActionPage({ searchParams }: { searchParams: Promise<{ type?: string; memory?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = await userDb(user.id);
  const memories = await db.select("memories", { order: { column: "created_at", ascending: false }, limit: 200 });
  const preset = sp.memory ? memories.find((m) => m.id === sp.memory) : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/action" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Action</Link>
      <PageHeader title="What do you need to get done?" description="ONE prepares the steps and drafts. Nothing is sent or signed without you." />
      <NewActionForm
        initialType={sp.type}
        memories={memories.map((m) => ({ id: m.id, title: m.title }))}
        presetMemory={preset ? { id: preset.id, title: preset.title } : undefined}
        aiDemo={env.aiMode === "demo"}
      />
    </div>
  );
}
