import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { PageHeader } from "@/components/PageHeader";
import { MyDayClient } from "./MyDayClient";

export const dynamic = "force-dynamic";

export default async function MyDayPage() {
  await requireOwner();
  const ws = await listWorkspaces();
  return (
    <>
      <PageHeader eyebrow="My Day" title="Tagessteuerung"
        subtitle="Briefing aus deinen echten Daten, Zeitblöcke für deine verfügbare Zeit und das Abend-Review. Was nicht erfasst ist, wird nicht erfunden." />
      <MyDayClient workspaces={ws.map((w) => ({ id: w.id, name: w.name }))} />
    </>
  );
}
