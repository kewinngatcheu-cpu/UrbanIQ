import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/PageHeader";
import { MemoryClient } from "./MemoryClient";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  await requireOwner();
  const [ws, settings] = await Promise.all([listWorkspaces(), getSettings()]);
  return (
    <>
      <PageHeader eyebrow="Memory Center" title="Was JARVIS weiß"
        subtitle="Volle Kontrolle: suchen, bearbeiten, anheften, löschen, Verlauf einsehen, exportieren. JARVIS behauptet nie, sich an etwas zu erinnern, das hier nicht steht."
        actions={<a className="btn btn-ghost" href="/api/memories/export">Export (JSON)</a>} />
      <MemoryClient workspaces={ws.map((w) => ({ id: w.id, name: w.name, color: w.color }))} memoryMode={settings.memoryMode} />
    </>
  );
}
