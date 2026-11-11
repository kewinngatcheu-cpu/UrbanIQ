import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { PageHeader } from "@/components/PageHeader";
import { GoalsClient } from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  await requireOwner();
  const ws = await listWorkspaces();
  return (
    <>
      <PageHeader eyebrow="Goals" title="Ziele"
        subtitle="Messbare Ziele mit Meilensteinen und verknüpften Aufgaben. JARVIS prüft, ob deine Woche tatsächlich auf diese Ziele einzahlt." />
      <GoalsClient workspaces={ws.map((w) => ({ id: w.id, name: w.name, color: w.color }))} />
    </>
  );
}
