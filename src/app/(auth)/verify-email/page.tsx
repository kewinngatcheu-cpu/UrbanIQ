import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MailCheck, FlaskConical } from "lucide-react";
import { requireUser, DEMO_VERIFY_COOKIE } from "@/lib/auth";
import { env } from "@/lib/config/env";
import { ResendButton } from "./resend";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  const user = await requireUser({ allowUnverified: true });
  if (user.email_verified) redirect(user.onboarding_completed ? "/app" : "/onboarding");
  const demoLink = env.backend === "local" ? (await cookies()).get(DEMO_VERIFY_COOKIE)?.value : undefined;
  return (
    <div className="animate-fade-up w-full max-w-[460px] rounded-3xl border border-line bg-white/90 p-8 text-center shadow-lift backdrop-blur">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mist text-accent animate-float">
        <MailCheck className="size-6" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-ink">Check your inbox</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We sent a verification link to <span className="font-medium text-ink">{user.email}</span>. Click it to activate your account.
      </p>

      {env.backend === "local" && (
        <div className="mt-6 rounded-2xl border border-dashed border-[#e2dcff] bg-lavender/60 p-4 text-left">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-lavender-ink"><FlaskConical className="size-4" /> Demo mail outbox</p>
          <p className="mt-1 text-xs leading-relaxed text-lavender-ink/80">
            No email service is connected in local demo mode, so the message is shown here instead of being sent.
          </p>
          {demoLink ? (
            <a href={demoLink} className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-accent-strong shadow-soft hover:bg-snow">
              Open verification link
            </a>
          ) : (
            <p className="mt-2 text-xs text-lavender-ink/80">The link is no longer in this browser. Request a new one below.</p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <ResendButton />
        <form action={logoutAction}>
          <button className="text-sm text-muted hover:text-ink">Use a different account</button>
        </form>
      </div>
    </div>
  );
}
