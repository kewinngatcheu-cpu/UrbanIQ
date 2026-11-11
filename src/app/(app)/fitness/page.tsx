import { requireOwner } from "@/lib/auth/guard";
import { PageHeader } from "@/components/PageHeader";
import { FitnessClient } from "./FitnessClient";

export const dynamic = "force-dynamic";

export default async function FitnessPage() {
  await requireOwner();
  return (
    <>
      <PageHeader eyebrow="Fitness" title="Training & Körperwerte"
        subtitle="Trainingslog und Messwerte mit Datum. Werte älter als 30 Tage gelten als möglicherweise veraltet. Gesundheitsdaten gehen nur an die KI, wenn du es in den Settings erlaubst." />
      <FitnessClient />
    </>
  );
}
