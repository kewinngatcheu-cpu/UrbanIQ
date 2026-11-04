import type { Metadata } from "next";
import Link from "next/link";
import { Users, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { findInvite } from "@/lib/org";
import { getT } from "@/lib/i18n/server";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/language-switch";
import { buttonVariants } from "@/components/ui/button";
import { AcceptInvite } from "./accept";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Invitation"), robots: { index: false } };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tr = await getT();
  const found = /^[A-Za-z0-9_-]{20,200}$/.test(token) ? await findInvite(token) : null;
  const user = await getCurrentUser();
  const enc = encodeURIComponent(token);
  let body: React.ReactNode;
  if (!found) {
    body = (
      <>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-peach text-peach-ink"><AlertCircle className="size-5" /></div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{tr("This invitation is invalid or has expired.")}</h1>
        <p className="text-[15px] text-muted">{tr("Ask the person who invited you to send a new invitation.")}</p>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>{tr("Go to ONE")}</Link>
      </>
    );
  } else {
    const { invite, org } = found;
    const intro = (
      <>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-ink text-white"><Users className="size-5" /></div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-accent-strong">ONE BUSINESS</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{tr("Join {company}", { company: org.name })}</h1>
        <p className="text-[15px] text-muted">{tr("You were invited as {role}.", { role: tr(ROLE_LABELS[invite.role]) })}</p>
      </>
    );
    if (!user) {
      body = (
        <>
          {intro}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/register?invite=${enc}`} className={buttonVariants({ size: "lg" })}>{tr("Create a ONE Business account")}</Link>
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={buttonVariants({ variant: "secondary", size: "lg" })}>{tr("I already have an account")}</Link>
          </div>
          <p className="text-xs text-muted">{tr("Use the email address the invitation was sent to.")}</p>
        </>
      );
    } else if (user.account_type !== "business") {
      body = <>{intro}<p className="rounded-xl bg-peach/70 px-3 py-2.5 text-[13.5px] text-peach-ink">{tr("You're signed in with a ONE Personal account. Invitations can only be accepted with a ONE Business account — sign out and create a business account with the invited email address.")}</p></>;
    } else if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      body = <>{intro}<p className="rounded-xl bg-peach/70 px-3 py-2.5 text-[13.5px] text-peach-ink">{tr("This invitation was sent to a different email address.")}</p></>;
    } else {
      body = <>{intro}<AcceptInvite token={token} /></>;
    }
  }
  return (
    <div className="bg-one-gradient min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><Link href="/"><Logo /></Link><LanguageSwitch /></header>
      <main className="mx-auto max-w-lg px-5 pb-20 pt-10">
        <div className="animate-fade-up space-y-5 rounded-3xl border border-line bg-white/90 p-8 shadow-lift">{body}</div>
      </main>
    </div>
  );
}
