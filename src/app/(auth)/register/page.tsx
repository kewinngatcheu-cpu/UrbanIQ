import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEnabled } from "@/lib/features";
import { isPlanId } from "@/lib/config/plans";
import { Notice } from "@/components/ui/misc";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.email_verified ? "/app" : "/verify-email");
  const open = await isEnabled("registrations_open");
  return (
    <div className="animate-fade-up w-full max-w-[460px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      <h1 className="text-2xl font-semibold text-ink">Create your ONE</h1>
      <p className="mt-1 mb-7 text-sm text-muted">One calm place for everything that matters.</p>
      {open ? <RegisterForm initialPlan={isPlanId(sp.plan) ? sp.plan : "free"} /> : <Notice tone="peach">New registrations are paused at the moment. Please check back soon.</Notice>}
    </div>
  );
}
