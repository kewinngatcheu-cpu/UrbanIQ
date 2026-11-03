import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { adminGate } from "@/lib/admin-guard";
import { getT } from "@/lib/i18n/server";
import { Logo } from "@/components/brand/logo";
import { MfaForm } from "./form";

export const metadata: Metadata = { title: "ONE", robots: { index: false } };

/** Second-factor check for the platform owner. Everyone else gets a 404 (requireOwner). */
export default async function VerifyOwner() {
  const { needsMfa } = await adminGate();
  if (!needsMfa) redirect("/admin");
  const tr = await getT();
  return (
    <div className="bg-one-gradient flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-5 rounded-3xl border border-line bg-white/90 p-8 shadow-lift">
        <Logo />
        <div className="flex size-11 items-center justify-center rounded-2xl bg-ink text-white"><ShieldCheck className="size-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-ink">{tr("Confirm it's you")}</h1>
          <p className="mt-1 text-sm text-muted">{tr("Enter the 6-digit code from your authenticator app.")}</p>
        </div>
        <MfaForm mode="verify" />
      </div>
    </div>
  );
}
