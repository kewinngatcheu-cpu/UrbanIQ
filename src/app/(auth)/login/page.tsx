import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user && user.status === "active") redirect(user.email_verified ? "/app" : "/verify-email");
  const notice = sp.error === "suspended" ? "This account has been suspended. Please contact support." : sp.error === "verify" ? "That verification link is invalid or has expired." : undefined;
  return (
    <div className="animate-fade-up w-full max-w-[420px] rounded-3xl border border-line bg-white/90 p-8 shadow-lift backdrop-blur">
      <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1 mb-7 text-sm text-muted">Sign in to continue to ONE.</p>
      <LoginForm next={sp.next ?? "/app"} notice={notice} />
    </div>
  );
}
