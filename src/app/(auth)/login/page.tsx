import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isOwner } from "@/lib/auth";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Sign in") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const tr = await getT();
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user && user.status === "active") redirect(!user.email_verified ? "/verify-email" : isOwner(user) ? "/admin" : "/app");
  const notice = sp.error === "suspended" ? tr("This account has been suspended. Please contact support.") : sp.error === "verify" ? tr("That verification link is invalid or has expired.") : undefined;
  return (
    <div className="animate-fade-up w-full max-w-[420px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      <h1 className="text-2xl font-semibold text-ink">{tr("Welcome back")}</h1>
      <p className="mt-1 mb-7 text-sm text-muted">{tr("Sign in to continue to ONE.")}</p>
      <LoginForm next={sp.next ?? "/app"} notice={notice} />
    </div>
  );
}
