import { requireOwner } from "@/lib/auth/guard";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getDb } from "@/lib/db";
import { listWorkspaces } from "@/lib/workspaces";
import { PageHeader } from "@/components/PageHeader";
import { NewVentureForm } from "./NewVentureForm";

export const dynamic = "force-dynamic";

export default async function BusinessPortfolio() {
  await requireOwner();
  const db = await getDb();
  const ws = (await listWorkspaces()).filter((w) => w.kind === "business");
  const counts = await db.query<{ workspace_id: string; tasks: number; mems: number }>(
    `SELECT w.id AS workspace_id,
       (SELECT count(*)::int FROM tasks t WHERE t.workspace_id = w.id AND t.status IN ('open','in_progress')) AS tasks,
       (SELECT count(*)::int FROM memories m WHERE m.workspace_id = w.id AND m.status IN ('active','uncertain')) AS mems
     FROM workspaces w`);
  const by = new Map(counts.map((c) => [c.workspace_id, c]));
  return (
    <>
      <PageHeader eyebrow="Business Portfolio" title="Ventures"
        subtitle="Jede Venture hat ein eigenes, isoliertes Gedächtnis, Profil und eigene Aufgaben. Informationen fließen nur bei expliziter Freigabe zwischen Workspaces." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ws.map((w) => {
          const p = w.profile as { phase?: string; targetMarket?: string | null; productDirection?: string | null };
          return (
            <Link key={w.id} href={`/business/${w.id}`} className="card card-hover block p-5">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: w.color }} /><span className="text-lg font-medium">{w.name}</span></div><ArrowUpRight size={16} className="text-muted" /></div>
              <p className="mt-2 text-sm text-muted">{w.description}</p>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Markt</dt><dd>{p.targetMarket ?? <span className="text-warn">offen</span>}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Produkt</dt><dd>{p.productDirection ?? <span className="text-warn">offen</span>}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Phase</dt><dd>{p.phase ?? "–"}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2 text-xs"><span className="chip">{by.get(w.id)?.tasks ?? 0} Aufgaben</span><span className="chip">{by.get(w.id)?.mems ?? 0} Wissenseinträge</span></div>
            </Link>
          );
        })}
        <NewVentureForm />
      </div>
      <div className="mt-6 card p-5 text-sm text-muted">
        <b className="text-fg">Phase 3 (geplant):</b> KPI-Dashboards, Pipeline/Kunden/Projekte, Finanzmodell, Roadmap und Entscheidungshistorie je Venture. Aktuell sind Profil, isoliertes Gedächtnis, Aufgaben und workspace-spezifischer Chat aktiv.
      </div>
    </>
  );
}
