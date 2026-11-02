import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/config/env";
import { mailConfigured } from "@/lib/mail";
import { ForgotForm } from "./form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const demo = env.backend === "local" && !mailConfigured();
  return (
    <div className="animate-fade-up w-full max-w-[420px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      <h1 className="text-2xl font-semibold text-ink">Forgot your password?</h1>
      <p className="mt-1 mb-7 text-sm text-muted">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotForm demo={demo} />
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="font-medium text-accent-strong hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
