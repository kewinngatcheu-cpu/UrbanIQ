import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { listGoals } from "@/lib/goals";
import { PageHeader } from "@/components/PageHeader";
import { TasksClient } from "@/components/TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  await requireOwner();
  const { goal } = await searchParams;
  const [ws, goals] = await Promise.all([listWorkspaces(), listGoals({ status: "active" })]);
  const g = goal ? (await listGoals()).find((x) => x.id === goal) : undefined;
  return (
    <>
      <PageHeader eyebrow="Operativ" title={g ? `Aufgaben · ${g.title}` : "Aufgaben"}
        subtitle="Priorisiert nach Wichtigkeit und Fälligkeit. Verschobene Deadlines werden gezählt – JARVIS spricht dich bei wiederholtem Aufschieben an. Zeitschätzungen verbessern den Tagesplan." />
      <TasksClient workspaces={ws.map((w) => ({ id: w.id, name: w.name, color: w.color }))} goals={goals.map((x) => ({ id: x.id, title: x.title }))} goalId={g?.id} />
    </>
  );
}
