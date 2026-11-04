import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/config/env";
import { mailConfigured } from "@/lib/mail";
import { ForgotForm } from "./form";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Reset password") };
}

export default async function ForgotPasswordPage() {
  const tr = await getT();
  const demo = env.backend === "local" && !mailConfigured();
  return (
    <div className="animate-fade-up w-full max-w-[420px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      <h1 className="text-2xl font-semibold text-ink">{tr("Forgot your password?")}</h1>
      <p className="mt-1 mb-7 text-sm text-muted">{tr("Enter your email and we'll send you a link to choose a new one.")}</p>
      <ForgotForm demo={demo} />
      <p className="mt-6 text-center text-sm text-muted">
        {tr("Remembered it?")} <Link href="/login" className="font-medium text-accent-strong hover:underline">{tr("Back to sign in")}</Link>
      </p>
    </div>
  );
}
