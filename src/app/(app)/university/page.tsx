import { requireOwner } from "@/lib/auth/guard";
import { listWorkspaces } from "@/lib/workspaces";
import { PageHeader } from "@/components/PageHeader";
import { UniversityClient } from "./UniversityClient";

export const dynamic = "force-dynamic";

export default async function UniversityPage() {
  await requireOwner();
  const ws = await listWorkspaces();
  return (
    <>
      <PageHeader eyebrow="University · HWR Berlin" title="Studium"
        subtitle="Module, Prüfungstermine, Lernaufgaben und Notenschnitt. Analyse von Vorlesungsunterlagen (Zusammenfassungen, Lernkarten) folgt mit der Dokumentenanalyse in Phase 3." />
      <UniversityClient workspaces={ws.map((w) => ({ id: w.id, name: w.name, color: w.color }))} />
    </>
  );
}
