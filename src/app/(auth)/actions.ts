"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { signIn, signUp, signOut, resendVerification, getCurrentUser, AuthError } from "@/lib/auth";
import { rateLimit } from "@/lib/auth/rate-limit";
import { isEnabled } from "@/lib/features";
import { audit } from "@/lib/audit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import { isPlanId } from "@/lib/config/plans";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254);
const password = z
  .string()
  .min(10, "Use at least 10 characters for your password.")
  .max(200)
  .regex(/[a-zA-Z]/, "Your password needs at least one letter.")
  .regex(/[0-9]/, "Your password needs at least one number.");

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    if (!rateLimit(`login:${await ip()}`, 10, 10 * 60 * 1000)) throw new AuthError("Too many attempts. Please wait a few minutes.");
    const e = email.parse(fd(form, "email"));
    const pw = fd(form, "password");
    if (!pw) throw new AuthError("Please enter your password.");
    if (!rateLimit(`login-email:${e}`, 8, 10 * 60 * 1000)) throw new AuthError("Too many attempts. Please wait a few minutes.");
    const profile = await signIn(e, pw);
    await audit(profile.id, "auth.login");
    return { ok: true, data: { verified: profile.email_verified, onboarded: profile.onboarding_completed } };
  });
  if (res.error) return res;
  if (!res.data?.verified) redirect("/verify-email");
  redirect(res.data?.onboarded ? safeNext(fd(form, "next")) : "/onboarding");
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    if (!(await isEnabled("registrations_open"))) throw new AuthError("Registrations are currently paused. Please try again later.");
    if (!rateLimit(`register:${await ip()}`, 5, 60 * 60 * 1000)) throw new AuthError("Too many sign-ups from this network. Please try again later.");
    const e = email.parse(fd(form, "email"));
    const pw = password.parse(fd(form, "password"));
    if (fd(form, "terms") !== "on") throw new AuthError("Please accept the terms and privacy policy.");
    const plan = fd(form, "plan");
    await signUp(e, pw, isPlanId(plan) ? plan : "free");
  });
  if (res.error) return res;
  redirect("/verify-email");
}

export async function resendAction(): Promise<ActionState> {
  return run(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("Please sign in again.");
    if (!rateLimit(`resend:${user.id}`, 3, 15 * 60 * 1000)) throw new AuthError("Please wait a few minutes before requesting another email.");
    await resendVerification(user.id);
    return { message: "A new verification link is on its way.", ts: Date.now() };
  });
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await signOut();
  if (user) await audit(user.id, "auth.logout");
  redirect("/");
}
