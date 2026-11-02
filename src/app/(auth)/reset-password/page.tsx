import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/config/env";
import { getCurrentUser, resetTokenValid } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { ResetForm } from "./form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  // Local: token from the email link. Supabase: the recovery session created by /auth/callback.
  const valid = env.backend === "supabase" ? !!(await getCurrentUser()) : !!token && (await resetTokenValid(token));
  return (
    <div className="animate-fade-up w-full max-w-[420px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      {valid ? (
        <>
          <h1 className="text-2xl font-semibold text-ink">Choose a new password</h1>
          <p className="mt-1 mb-7 text-sm text-muted">You&apos;ll be signed in right after. Other devices will be signed out.</p>
          <ResetForm token={token ?? ""} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-ink">This link has expired</h1>
          <p className="mt-2 text-sm text-muted">Reset links are valid for one hour and can be used once.</p>
          <Link href="/forgot-password" className={buttonVariants({ className: "mt-6 w-full", size: "lg" })}>Request a new link</Link>
        </>
      )}
    </div>
  );
}
