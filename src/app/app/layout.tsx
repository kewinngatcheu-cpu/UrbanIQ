import { redirect } from "next/navigation";
import { requireUser, isOwner } from "@/lib/auth";
import { env } from "@/lib/config/env";
import { PLANS } from "@/lib/config/plans";
import { Sidebar } from "@/components/app/sidebar";
import { logoutAction } from "@/app/(auth)/actions";
import { TzCookie } from "@/components/app/tz-cookie";
import { cookies } from "next/headers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboarding_completed) redirect("/onboarding");
  return (
    <div className="min-h-screen bg-white">
      <TzCookie current={(await cookies()).get("one_tz")?.value ?? null} />
      <Sidebar
        name={user.full_name ?? ""}
        email={user.email}
        planName={PLANS[user.plan].name}
        isOwner={isOwner(user)}
        aiDemo={env.aiMode === "demo"}
        logout={logoutAction}
      />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-8 lg:pb-16 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}
