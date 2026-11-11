import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth/session";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const db = await getDb();
  const [owner] = await db.query(`SELECT 1 FROM owner`);
  if (!owner) redirect("/setup");
  if (await isAuthenticated()) redirect("/");
  return (
    <AuthCard title="Anmelden" subtitle="Persönliches KI-Betriebssystem">
      <LoginForm />
    </AuthCard>
  );
}
