import { requireOwner } from "@/lib/auth/guard";
import { listTasks } from "@/lib/tasks";
import { PageHeader } from "@/components/PageHeader";
import { DisciplineClient } from "./DisciplineClient";

export const dynamic = "force-dynamic";

export default async function DisciplinePage() {
  await requireOwner();
  const tasks = (await listTasks({ status: "open" })).map((t) => ({ id: t.id, title: t.title, workspace_id: t.workspace_id }));
  return (
    <>
      <PageHeader eyebrow="Discipline" title="Fokus & Konstanz"
        subtitle="Gewohnheiten, Fokus-Sessions und ehrliche Ursachenanalyse bei Aufschieben. Produktivität heißt nicht, ständig beschäftigt zu sein." />
      <DisciplineClient tasks={tasks} />
    </>
  );
}
