"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { signIn, signUp, signOut, resendVerification, getCurrentUser, AuthError, requestPasswordReset, completePasswordReset, isOwner } from "@/lib/auth";
import { rateLimit } from "@/lib/auth/rate-limit";
import { isEnabled } from "@/lib/features";
import { audit } from "@/lib/audit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import { isWorld, DEFAULT_PLAN } from "@/lib/config/plans";
import { findPlan } from "@/lib/plans-store";
import { findInvite, INVITE_COOKIE } from "@/lib/org";
import { cookies } from "next/headers";
import { z } from "zod";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const email = emailSchema;
const password = passwordSchema;

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
    return { ok: true, data: { verified: profile.email_verified, onboarded: profile.onboarding_completed, owner: isOwner(profile), business: profile.account_type === "business" } };
  });
  if (res.error) return res;
  // Full navigation on the client (login-form.tsx) so the app shell starts with a fresh router.
  // The owner lands in the admin view; everyone else in their personal ONE.
  const next = fd(form, "next");
  const home = res.data?.business ? "/business" : "/app";
  const target = !res.data?.verified ? "/verify-email"
    : res.data?.owner ? (next.startsWith("/admin") || !next || next === "/app" ? "/admin" : safeNext(next))
    : !res.data?.onboarded ? "/onboarding"
    : next && next !== "/app" ? safeNext(next) : home;
  return { ok: true, data: { target }, ts: Date.now() };
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    if (!(await isEnabled("registrations_open"))) throw new AuthError("Registrations are currently paused. Please try again later.");
    if (!rateLimit(`register:${await ip()}`, 5, 60 * 60 * 1000)) throw new AuthError("Too many sign-ups from this network. Please try again later.");
    const e = email.parse(fd(form, "email"));
    const pw = password.parse(fd(form, "password"));
    if (fd(form, "terms") !== "on") throw new AuthError("Please accept the terms and privacy policy.");
    const world = isWorld(fd(form, "world")) ? (fd(form, "world") as "personal" | "business") : "personal";
    if (!(await isEnabled(world === "business" ? "business_signups" : "personal_signups"))) throw new AuthError("Registrations are currently paused. Please try again later.");
    const inviteToken = fd(form, "invite");
    let company: string | null = null;
    if (inviteToken) {
      const inv = await findInvite(inviteToken);
      if (!inv) throw new AuthError("This invitation is invalid or has expired.");
      if (inv.invite.email.toLowerCase() !== e) throw new AuthError("This invitation was sent to a different email address.");
      (await cookies()).set(INVITE_COOKIE, inviteToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
    } else if (world === "business") {
      company = z.string().trim().min(2, "Please enter your company name.").max(120).parse(fd(form, "company"));
    }
    const planDef = await findPlan(fd(form, "plan"));
    const plan = planDef && planDef.world === world && planDef.active ? planDef.id : DEFAULT_PLAN[world];
    await signUp(e, pw, plan, world, company);
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

export async function forgotPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    if (!rateLimit(`forgot:${await ip()}`, 5, 15 * 60 * 1000)) throw new AuthError("Too many requests. Please wait a few minutes.");
    const e = email.parse(fd(form, "email"));
    if (!rateLimit(`forgot-email:${e}`, 3, 60 * 60 * 1000)) throw new AuthError("Too many requests for this address. Please try again later.");
    await requestPasswordReset(e);
    // Same answer whether or not the account exists.
    return { ok: true, message: "If an account exists for this address, a reset link is on its way.", ts: Date.now() };
  });
}

export async function resetPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    if (!rateLimit(`reset:${await ip()}`, 10, 15 * 60 * 1000)) throw new AuthError("Too many attempts. Please wait a few minutes.");
    const pw = password.parse(fd(form, "password"));
    if (pw !== fd(form, "confirm")) throw new AuthError("The passwords don't match.");
    const userId = await completePasswordReset(fd(form, "token") || null, pw);
    await audit(userId, "auth.password_reset");
    return { ok: true, data: { target: "/app" }, ts: Date.now() };
  });
}
