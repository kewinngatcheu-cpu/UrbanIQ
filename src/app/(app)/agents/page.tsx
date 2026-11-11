import { requireOwner } from "@/lib/auth/guard";
import { listAudit } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const LEVELS = [
  { n: 1, name: "Lesen", text: "Autorisierte Informationen lesen und analysieren." },
  { n: 2, name: "Vorbereiten", text: "Entwürfe, Pläne, Vorschläge erstellen (z. B. Gedächtnis-Vorschläge)." },
  { n: 3, name: "Ausführen mit Freigabe", text: "Aktionen nach expliziter Bestätigung (z. B. deine Befehle, Löschungen)." },
  { n: 4, name: "Begrenzte Autonomie", text: "Vorab freigegebene, risikoarme, umkehrbare Aufgaben. In Phase 1 nicht aktiv." },
];

const AGENTS = ["Executive Agent", "Personal", "Productivity", "Business / NGCX / VenturesX", "Finance", "Research", "Software Development", "QA", "Security"];

export default async function AgentCenter() {
  await requireOwner();
  const entries = (await listAudit(200)) as { id: number; at: string; actor: string; action: string; target: string | null; workspace_id: string | null; level: number; status: string; details: Record<string, unknown> }[];
  return (
    <>
      <PageHeader eyebrow="Agent Center" title="Aktivität & Berechtigungen"
        subtitle="Jede Aktion von dir, JARVIS oder einem Agenten wird protokolliert – inklusive Fehlschlägen. Agenten melden nur, was tatsächlich passiert ist." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card overflow-hidden">
          <div className="border-b border-ink-600/40 px-4 py-3 font-medium">Aktivitätsprotokoll</div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-800 text-left text-xs text-muted">
                <tr><th className="px-4 py-2">Zeit</th><th className="px-2 py-2">Akteur</th><th className="px-2 py-2">Aktion</th><th className="px-2 py-2">Stufe</th><th className="px-2 py-2">Status</th><th className="hidden px-2 py-2 md:table-cell">Details</th></tr>
              </thead>
              <tbody>
                {entries.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Noch keine Einträge.</td></tr>}
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-ink-600/30">
                    <td className="whitespace-nowrap px-4 py-2 text-muted">{new Date(e.at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "medium" })}</td>
                    <td className="px-2 py-2">{e.actor}</td>
                    <td className="px-2 py-2 font-mono text-xs">{e.action}{e.workspace_id ? <span className="text-muted"> @{e.workspace_id}</span> : null}</td>
                    <td className="px-2 py-2 text-muted">L{e.level}</td>
                    <td className={`px-2 py-2 ${e.status === "failed" ? "text-err" : e.status === "succeeded" ? "text-ok" : "text-warn"}`}>{e.status}</td>
                    <td className="hidden max-w-[280px] truncate px-2 py-2 text-xs text-muted md:table-cell" title={JSON.stringify(e.details)}>{JSON.stringify(e.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <div className="label mb-3">Autonomiestufen</div>
            <ol className="space-y-3">{LEVELS.map((l) => <li key={l.n} className="text-sm"><b>L{l.n} · {l.name}</b><div className="text-muted">{l.text}</div></li>)}</ol>
            <p className="mt-3 text-xs text-muted">Immer bestätigungspflichtig: E-Mails senden, veröffentlichen, Käufe, Finanztransaktionen, Datenweitergabe, destruktive Operationen.</p>
          </section>
          <section className="card p-5">
            <div className="label mb-2">Agenten · Phase 5</div>
            <p className="text-sm text-muted">Noch nicht aktiv. Geplant: Executive Agent orchestriert Spezialisten mit eigenen Rechten, Werkzeugen und Logs.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{AGENTS.map((a) => <span key={a} className="chip">{a}</span>)}</div>
          </section>
        </div>
      </div>
    </>
  );
}
