import { requireOwner } from "@/lib/auth/guard";
import { listConnectorStatus } from "@/lib/integrations";
import { PageHeader } from "@/components/PageHeader";
import { ConnectorToggle } from "./ConnectorToggle";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: string }> = {
  connected: { label: "Verbunden", color: "#22C55E" },
  configured_disabled: { label: "Deaktiviert", color: "#8D9AAF" },
  missing_credentials: { label: "Zugangsdaten fehlen", color: "#F59E0B" },
  planned: { label: "Geplant", color: "#8D9AAF" },
  error: { label: "Fehler", color: "#EF4444" },
};

export default async function IntegrationsPage() {
  await requireOwner();
  const connectors = await listConnectorStatus();
  return (
    <>
      <PageHeader eyebrow="Integrations" title="Connector-Registry"
        subtitle="Status basiert ausschließlich auf echtem Zustand. Geplante Connectoren sind nicht implementiert und lassen sich nicht aktivieren. Kein Konto wird ohne deine Autorisierung verbunden; Schlüssel liegen nur serverseitig in Umgebungsvariablen." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {connectors.map((c) => (
          <div key={c.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted">{c.category} · {c.auth === "oauth" ? "OAuth" : c.auth === "api_key" ? "API-Key" : "lokal"}</div></div>
              <span className="chip" style={{ color: STATUS[c.status].color }}>● {STATUS[c.status].label}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{c.description}</p>
            <div className="mt-3 text-xs"><span className="text-muted">Aktionen:</span> {c.actions.join(" · ")}</div>
            <div className="mt-1 text-xs"><span className="text-muted">Berechtigungen:</span> {c.permissions.join(" · ")}</div>
            {c.status === "missing_credentials" && <div className="mt-2 text-xs text-warn">Setze {c.missingEnv.join(", ")} in .env.local und starte neu.</div>}
            {c.lastError && <div className="mt-2 text-xs text-err">{c.lastError}</div>}
            <div className="mt-auto pt-4">
              {c.implemented ? <ConnectorToggle id={c.id} enabled={c.enabled} disabled={c.status === "missing_credentials"} /> : <span className="text-xs text-muted">Phase {c.phase}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
