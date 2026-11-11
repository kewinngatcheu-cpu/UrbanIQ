import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { PageHeader } from "@/components/PageHeader";
import { TasksClient } from "@/components/TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  await requireOwner();
  const ws = await listWorkspaces();
  return (
    <>
      <PageHeader eyebrow="Operativ" title="Aufgaben" subtitle="Priorisiert nach Wichtigkeit und Fälligkeit. Verschobene Deadlines werden gezählt – JARVIS spricht dich bei wiederholtem Aufschieben an." />
      <TasksClient workspaces={ws.map((w) => ({ id: w.id, name: w.name, color: w.color }))} />
    </>
  );
}
