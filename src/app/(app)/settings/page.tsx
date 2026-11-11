import { requireOwner } from "@/lib/auth/guard";
import { getSettings } from "@/lib/settings";
import { providerStatus } from "@/lib/ai/registry";
import { getEmbedder } from "@/lib/memory/embeddings";
import { getDb } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireOwner();
  const db = await getDb();
  const sessions = await db.query<{ device_label: string; last_seen_at: string; created_at: string }>(
    `SELECT device_label, last_seen_at, created_at FROM sessions WHERE expires_at > now() ORDER BY last_seen_at DESC`);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Einstellungen" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <SettingsForm initial={await getSettings()} />
        <div className="space-y-6">
          <section className="card p-5 text-sm">
            <div className="label mb-3">Systemstatus</div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-muted">Datenbank</span><span>{db.driver === "pglite" ? "PGlite (lokal, eingebettet)" : "PostgreSQL"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Embeddings</span><span>{getEmbedder().id}</span></div>
              {providerStatus().map((p) => (
                <div key={p.id} className="flex justify-between"><span className="text-muted">{p.label}</span><span className={p.configured ? "text-ok" : "text-warn"}>{p.configured ? `Key gesetzt · ${p.defaultModel}` : "kein Key"}</span></div>
              ))}
            </div>
          </section>
          <section className="card p-5 text-sm">
            <div className="label mb-3">Aktive Sitzungen</div>
            <ul className="space-y-1.5">{sessions.map((s, i) => <li key={i} className="flex justify-between"><span>{s.device_label}</span><span className="text-muted">{new Date(s.last_seen_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}</span></li>)}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
