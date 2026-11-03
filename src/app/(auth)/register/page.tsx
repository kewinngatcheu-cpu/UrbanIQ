import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, Check, Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isEnabled } from "@/lib/features";
import { isWorld, DEFAULT_PLAN } from "@/lib/config/plans";
import { plansFor } from "@/lib/plans-store";
import { findInvite } from "@/lib/org";
import { Notice } from "@/components/ui/misc";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Create your account") };
}

const PERSONAL_USES = ["Personal documents", "Bills and contracts", "Insurance", "Authority matters", "Appointments and deadlines", "Moving and flat hunting", "Applications and studies", "Travel and bookings", "Personal goals"];
const BUSINESS_USES = ["Company documents", "Clients and projects", "Contracts and invoices", "Business deadlines", "Meetings and tasks", "Team organisation", "Internal processes", "Knowledge base", "Workflows"];

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string; world?: string; invite?: string }> }) {
  const tr = await getT();
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.email_verified ? (user.account_type === "business" ? "/business" : "/app") : "/verify-email");
  const open = await isEnabled("registrations_open");
  const invite = sp.invite ? await findInvite(sp.invite) : null;
  const world = invite ? "business" : isWorld(sp.world) ? sp.world : null;

  if (!open) {
    return (
      <div className="w-full max-w-[460px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift">
        <Notice tone="peach">{tr("New registrations are paused at the moment. Please check back soon.")}</Notice>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="animate-fade-up w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-4xl">{tr("How do you want to use ONE?")}</h1>
          <p className="mt-2 text-[15px] text-muted">{tr("Your choice shapes your whole ONE. You can't switch on your own later — a change goes through a short request.")}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {([
            ["personal", Heart, "ONE Personal", "Your personal life, organized.", "For private individuals.", PERSONAL_USES, "bg-mist text-accent", "border-cloud"],
            ["business", Briefcase, "ONE Business", "Your business, under control.", "For companies, freelancers and teams.", BUSINESS_USES, "bg-ink text-white", "border-line"],
          ] as const).map(([id, Icon, name, claim, who, uses, iconCls]) => (
            <Link key={id} href={`/register?world=${id}`} className="group flex flex-col rounded-3xl border border-line bg-white p-7 shadow-soft transition hover:-translate-y-0.5 hover:border-cloud hover:shadow-lift focus-visible:outline-2">
              <span className={`flex size-12 items-center justify-center rounded-2xl ${iconCls}`}><Icon className="size-5" /></span>
              <span className="mt-5 text-[12px] font-semibold tracking-[0.16em] text-accent-strong">{name.toUpperCase()}</span>
              <span className="mt-1 text-2xl font-semibold tracking-tight text-ink">{tr(claim)}</span>
              <span className="mt-1 text-sm text-muted">{tr(who)}</span>
              <ul className="mt-5 grid flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {uses.map((u) => (
                  <li key={u} className="flex items-start gap-2 text-[13.5px] text-ink"><Check className="mt-0.5 size-3.5 shrink-0 text-accent" strokeWidth={3} /> {tr(u)}</li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-strong">{tr("Continue with {name}", { name })} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">{tr("Already have an account?")} <Link href="/login" className="font-medium text-accent-strong hover:underline">{tr("Sign in")}</Link></p>
      </div>
    );
  }

  const plans = (await plansFor(world)).map((p) => ({ id: p.id, name: p.name, priceMonthlyEur: p.priceMonthlyEur }));
  const initialPlan = plans.some((p) => p.id === sp.plan) ? sp.plan! : DEFAULT_PLAN[world];
  return (
    <div className="animate-fade-up w-full max-w-[480px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      {!invite && <Link href="/register" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> {tr("Personal or Business")}</Link>}
      <p className="text-[12px] font-semibold tracking-[0.16em] text-accent-strong">{world === "business" ? "ONE BUSINESS" : "ONE PERSONAL"}</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{world === "business" ? (invite ? tr("Join {company} on ONE", { company: invite.org.name }) : tr("Create your company workspace")) : tr("Create your ONE")}</h1>
      <p className="mt-1 mb-7 text-sm text-muted">{world === "business" ? tr("Your business, under control.") : tr("Your personal life, organized.")}</p>
      <RegisterForm world={world} plans={invite ? [] : plans} initialPlan={initialPlan} invite={invite ? { token: sp.invite!, email: invite.invite.email } : null} />
    </div>
  );
}
