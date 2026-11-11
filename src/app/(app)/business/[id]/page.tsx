import { requireOwner } from "@/lib/auth/guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getWorkspace, listWorkspaces } from "@/lib/workspaces";
import { searchMemories } from "@/lib/memory/service";
import { PageHeader } from "@/components/PageHeader";
import { TasksClient } from "@/components/TasksClient";
import { ProfileEditor } from "./ProfileEditor";

export const dynamic = "force-dynamic";

export default async function VenturePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const w = await getWorkspace(id);
  if (!w || w.kind !== "business") notFound();
  const [mems, all] = await Promise.all([searchMemories({ workspaceId: id, limit: 50 }), listWorkspaces()]);
  return (
    <>
      <PageHeader eyebrow="Business Workspace" title={w.name} subtitle={w.description}
        actions={<Link href={`/chat?ws=${w.id}`} className="btn btn-primary"><Sparkles size={15} /> Mit JARVIS über {w.name} sprechen</Link>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-medium">Aufgaben</h2>
            <TasksClient workspaces={all.map((x) => ({ id: x.id, name: x.name, color: x.color }))} fixedWorkspace={w.id} />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-medium">Wissensbasis</h2><Link href="/memory" className="text-sm text-muted hover:text-cyan">Memory Center →</Link></div>
            <ul className="space-y-2">
              {mems.length === 0 && <li className="card p-4 text-sm text-muted">Noch keine Einträge. Im Chat dieses Workspaces: <code>/merke …</code></li>}
              {mems.map((m) => (
                <li key={m.id} className="card p-4">
                  <div className={`font-medium ${m.status === "outdated" ? "text-muted line-through" : ""}`}>{m.title}</div>
                  <p className="mt-1 text-sm text-muted">{m.content}</p>
                  <div className="mt-2 flex gap-1.5"><span className="chip">{m.category}</span>{m.status !== "active" && <span className="chip !text-warn">{m.status}</span>}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <ProfileEditor workspace={{ id: w.id, name: w.name, description: w.description, profile: w.profile }} />
      </div>
    </>
  );
}
