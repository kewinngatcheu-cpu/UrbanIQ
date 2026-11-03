import { LanguageSwitch } from "@/components/language-switch";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { OnboardingFlow } from "./flow";
import { BusinessSetup } from "./business";
import { plansFor } from "@/lib/plans-store";
import { findInvite, INVITE_COOKIE, trialDays } from "@/lib/org";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Welcome") };
}

export default async function OnboardingPage() {
  const user = await requireUser();
  const hasOrg = user.account_type === "business" && !!(await systemDb().selectOne("organization_members", { user_id: user.id, status: "active" }));
  // Business accounts without a company (e.g. removed from a team) can set up or join one here.
  if (user.onboarding_completed && (user.account_type !== "business" || hasOrg)) redirect(user.account_type === "business" ? "/business" : "/app");
  const prefs = await systemDb().selectOne("user_preferences", { user_id: user.id });
  const tr = await getT();
  const invite = user.account_type === "business" ? (await cookies()).get(INVITE_COOKIE)?.value : undefined;
  const pending = invite ? await findInvite(invite) : null;
  return (
    <div className="bg-one-gradient relative min-h-screen">
      <div className="pointer-events-none absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-sky/40 blur-3xl" />
      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><Logo /><LanguageSwitch /></header>
      <main className="relative mx-auto max-w-2xl px-5 pb-20 pt-6">
        {user.account_type === "business" ? (
          <BusinessSetup
            invite={pending ? { org: pending.org.name, role: pending.invite.role } : null}
            company={prefs?.company_name ?? ""}
            requestedPlan={prefs?.requested_plan ?? "starter"}
            plans={(await plansFor("business")).map((p) => ({ id: p.id, name: p.name, highlight: p.highlight, priceMonthlyEur: p.priceMonthlyEur, bullets: p.bullets }))}
            trialDays={await trialDays()}
          />
        ) : (
          <OnboardingFlow email={user.email} requestedPlan={prefs?.requested_plan ?? "free"} plans={(await plansFor("personal")).map((p) => ({ id: p.id, name: p.name, highlight: p.highlight, priceMonthlyEur: p.priceMonthlyEur, bullets: p.bullets }))} />
        )}
        <p className="sr-only">{tr("Welcome")}</p>
      </main>
    </div>
  );
}
