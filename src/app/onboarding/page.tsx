import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { OnboardingFlow } from "./flow";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboarding_completed) redirect("/app");
  const prefs = await systemDb().selectOne("user_preferences", { user_id: user.id });
  return (
    <div className="bg-one-gradient relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-sky/40 blur-3xl" />
      <header className="relative mx-auto flex h-16 max-w-6xl items-center px-5"><Logo /></header>
      <main className="relative mx-auto max-w-2xl px-5 pb-20 pt-6">
        <OnboardingFlow email={user.email} requestedPlan={prefs?.requested_plan ?? "free"} />
      </main>
    </div>
  );
}
