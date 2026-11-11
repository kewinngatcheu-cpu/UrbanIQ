import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { AuthCard } from "@/components/AuthCard";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const db = await getDb();
  const [owner] = await db.query(`SELECT 1 FROM owner`);
  if (owner) redirect("/login");
  return (
    <AuthCard title="Ersteinrichtung" subtitle="Einmalig: Eigentümer-Konto anlegen">
      <SetupForm tokenConfigured={Boolean(process.env.JARVIS_SETUP_TOKEN)} />
    </AuthCard>
  );
}
