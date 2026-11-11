import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { FloatingVoice } from "@/components/FloatingVoice";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const db = await getDb();
  const [owner] = await db.query<{ display_name: string }>(`SELECT display_name FROM owner`);
  if (!owner) redirect("/setup");
  if (!(await isAuthenticated())) redirect("/login");
  return (
    <div className="min-h-dvh">
      <Sidebar ownerName={owner.display_name} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </main>
      <FloatingVoice />
    </div>
  );
}
