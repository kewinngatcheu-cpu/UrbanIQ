import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import { systemDb } from "@/lib/db";
import type { Profile } from "@/lib/db/types";
import { isPlanId, type PlanId } from "@/lib/config/plans";
import { createSession, destroySession, readSession } from "./session";
import { hashPassword, randomToken, sha256, verifyPassword } from "./password";
import { supabaseUserClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/mail";

export const DEMO_VERIFY_COOKIE = "one_demo_verify";

export class AuthError extends Error {}

/** Creates profile, free subscription and preferences if missing. Idempotent. Never grants elevated roles. */
export async function ensureProfile(id: string, email: string, opts: { verified: boolean; requestedPlan?: PlanId | null }) {
  const db = systemDb();
  let profile = await db.selectOne("profiles", { id });
  if (!profile) {
    profile = await db.insert("profiles", {
      id,
      email: email.toLowerCase(),
      full_name: null,
      role: "user",
      status: "active",
      plan: "free",
      email_verified: opts.verified,
      onboarding_completed: false,
      last_active_at: null,
    });
  } else if (opts.verified && !profile.email_verified) {
    [profile] = await db.update("profiles", { id }, { email_verified: true });
  }
  if (!(await db.selectOne("subscriptions", { user_id: id }))) {
    await db.insert("subscriptions", {
      user_id: id, plan: "free", status: "active", provider: "none", provider_ref: null,
      stripe_customer_id: null, cancel_at_period_end: false,
      price_monthly_eur: 0, current_period_end: null, canceled_at: null,
    });
  }
  if (!(await db.selectOne("user_preferences", { user_id: id }))) {
    await db.insert("user_preferences", {
      user_id: id, interests: [], requested_plan: opts.requestedPlan ?? null, timezone: null,
    });
  }
  return profile!;
}

/** Owner = configured server-side user id AND role 'owner' in the database. Both must hold. */
export function isOwner(profile: Pick<Profile, "id" | "role"> | null | undefined): boolean {
  return !!profile && !!env.ownerUserId && profile.id === env.ownerUserId && profile.role === "owner";
}

async function resolveUserId(): Promise<{ id: string; email: string; verified: boolean } | null> {
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "", verified: !!data.user.email_confirmed_at };
  }
  const session = await readSession();
  if (!session) return null;
  const id = session.userId;
  const cred = await systemDb().selectOne("local_credentials", { id });
  if (!cred) return null;
  // Sessions issued before the last password change are revoked (JWT iat has second precision).
  if (cred.password_changed_at && session.issuedAt < Math.floor(Date.parse(cred.password_changed_at) / 1000) * 1000) return null;
  return { id, email: cred.email, verified: cred.verify_token_hash === null };
}

/** The signed-in user's profile for this request (memoized), or null. */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const u = await resolveUserId();
  if (!u) return null;
  let profile = await systemDb().selectOne("profiles", { id: u.id });
  if (!profile || (u.verified && !profile.email_verified)) {
    profile = await ensureProfile(u.id, u.email, { verified: u.verified });
  }
  const last = profile.last_active_at ? Date.parse(profile.last_active_at) : 0;
  if (Date.now() - last > 60 * 60 * 1000) {
    await systemDb().update("profiles", { id: u.id }, { last_active_at: new Date().toISOString() });
  }
  return profile;
});

/** Requires a signed-in, verified, active user. Redirects otherwise. */
export async function requireUser(opts: { allowUnverified?: boolean } = {}): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "suspended") redirect("/auth/signout?reason=suspended");
  if (!user.email_verified && !opts.allowUnverified) redirect("/verify-email");
  return user;
}

/** Server-side owner gate. Non-owners get a 404-style redirect — the admin area is not advertised. */
export async function requireOwner(): Promise<Profile> {
  const user = await requireUser();
  if (!isOwner(user)) redirect("/app");
  return user;
}

/** For server actions: returns the owner or throws (no redirect side effects). */
export async function assertOwner(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user || user.status !== "active" || !user.email_verified || !isOwner(user)) {
    throw new AuthError("Forbidden");
  }
  return user;
}

export async function assertUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in again.");
  if (user.status !== "active") throw new AuthError("This account is suspended.");
  if (!user.email_verified) throw new AuthError("Please verify your email address first.");
  return user;
}

// ───────────────────────── Sign up / in / out ─────────────────────────

export async function signUp(email: string, password: string, requestedPlan: PlanId): Promise<{ needsVerification: true }> {
  email = email.trim().toLowerCase();
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${env.appUrl}/auth/callback?next=/onboarding`,
        data: { requested_plan: requestedPlan },
      },
    });
    if (error) throw new AuthError(error.message);
    return { needsVerification: true };
  }

  const db = systemDb();
  const existing = await db.selectOne("local_credentials", { email });
  if (existing) {
    // Do not reveal whether the address exists: behave like a normal sign-up.
    return { needsVerification: true };
  }
  const token = randomToken();
  const cred = await db.insert("local_credentials", {
    email,
    password_hash: await hashPassword(password),
    verify_token_hash: sha256(token),
    verify_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    reset_token_hash: null,
    reset_expires_at: null,
    password_changed_at: null,
  });
  await ensureProfile(cred.id, email, { verified: false, requestedPlan: isPlanId(requestedPlan) ? requestedPlan : null });
  await createSession(cred.id);
  await deliverVerification(email, token);
  return { needsVerification: true };
}

/**
 * Sends the verification email (Resend) when configured. Without a mail service, the link is placed
 * in a short-lived httpOnly cookie of the browser that signed up and shown on /verify-email,
 * clearly labelled as demo outbox.
 */
async function deliverVerification(email: string, token: string) {
  const url = `${env.appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  const { delivered } = await sendMail({
    to: email,
    subject: "Confirm your email for ONE",
    heading: "Welcome to ONE",
    body: "Please confirm your email address to activate your account. The link is valid for 24 hours.",
    cta: { label: "Confirm email", url },
    footer: "If you didn't create a ONE account, you can ignore this email.",
  });
  if (delivered) return;
  const store = await cookies();
  store.set(DEMO_VERIFY_COOKIE, url, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 3600 });
  if (env.logDemoMail) console.info(`[ONE demo mail] Verification link for ${email}: ${url}`);
}

export async function resendVerification(userId: string) {
  if (env.backend === "supabase") {
    const user = await systemDb().selectOne("profiles", { id: userId });
    if (!user) return;
    const sb = await supabaseUserClient();
    await sb.auth.resend({ type: "signup", email: user.email, options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=/onboarding` } });
    return;
  }
  const db = systemDb();
  const cred = await db.selectOne("local_credentials", { id: userId });
  if (!cred || cred.verify_token_hash === null) return;
  const token = randomToken();
  await db.update("local_credentials", { id: userId }, {
    verify_token_hash: sha256(token),
    verify_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  await deliverVerification(cred.email, token);
}

/** Local mode: consume a verification token. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const db = systemDb();
  const cred = await db.selectOne("local_credentials", { verify_token_hash: sha256(token) });
  if (!cred || !cred.verify_expires_at || Date.parse(cred.verify_expires_at) < Date.now()) return false;
  await db.update("local_credentials", { id: cred.id }, { verify_token_hash: null, verify_expires_at: null });
  await db.update("profiles", { id: cred.id }, { email_verified: true });
  await createSession(cred.id);
  return true;
}

export async function signIn(email: string, password: string): Promise<Profile> {
  email = email.trim().toLowerCase();
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new AuthError("Email or password is incorrect.");
    const profile = await ensureProfile(data.user.id, email, { verified: !!data.user.email_confirmed_at });
    if (profile.status === "suspended") {
      await sb.auth.signOut();
      throw new AuthError("This account has been suspended. Please contact support.");
    }
    return profile;
  }
  const db = systemDb();
  const cred = await db.selectOne("local_credentials", { email });
  // Always run a hash comparison to keep timing uniform.
  const ok = cred
    ? await verifyPassword(password, cred.password_hash)
    : (await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA"), false);
  if (!cred || !ok) throw new AuthError("Email or password is incorrect.");
  const profile = await ensureProfile(cred.id, cred.email, { verified: cred.verify_token_hash === null });
  if (profile.status === "suspended") throw new AuthError("This account has been suspended. Please contact support.");
  await createSession(cred.id);
  return profile;
}

export async function signOut() {
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    await sb.auth.signOut();
    return;
  }
  await destroySession();
}

/** Re-authenticate (used before destructive account operations). */
export async function checkPassword(userId: string, password: string): Promise<boolean> {
  if (env.backend === "supabase") {
    const profile = await systemDb().selectOne("profiles", { id: userId });
    if (!profile) return false;
    const sb = await supabaseUserClient();
    const { error } = await sb.auth.signInWithPassword({ email: profile.email, password });
    return !error;
  }
  const cred = await systemDb().selectOne("local_credentials", { id: userId });
  return !!cred && (await verifyPassword(password, cred.password_hash));
}

// ───────────────────────── Password reset & change ─────────────────────────

/**
 * Starts a password reset. Never reveals whether the address exists.
 * Local mode without a mail service: the link is only written to the server log (development),
 * never shown in the browser — otherwise anyone could reset any account.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  email = email.trim().toLowerCase();
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    await sb.auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl}/auth/callback?next=/reset-password` });
    return;
  }
  const db = systemDb();
  const cred = await db.selectOne("local_credentials", { email });
  if (!cred) return;
  const token = randomToken();
  await db.update("local_credentials", { id: cred.id }, {
    reset_token_hash: sha256(token),
    reset_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  const url = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const { delivered } = await sendMail({
    to: email,
    subject: "Reset your ONE password",
    heading: "Reset your password",
    body: "Someone (hopefully you) asked to reset the password of your ONE account. The link is valid for 1 hour.",
    cta: { label: "Choose a new password", url },
    footer: "If you didn't ask for this, you can ignore this email — your password stays the same.",
  });
  if (!delivered && env.logDemoMail) console.info(`[ONE demo mail] Password reset link for ${email}: ${url}`);
}

/** Local mode: is this reset token valid? */
export async function resetTokenValid(token: string): Promise<boolean> {
  const cred = await systemDb().selectOne("local_credentials", { reset_token_hash: sha256(token) });
  return !!cred && !!cred.reset_expires_at && Date.parse(cred.reset_expires_at) > Date.now();
}

/** Completes a reset. Local: via token. Supabase: via the recovery session from the email link. */
export async function completePasswordReset(token: string | null, newPassword: string): Promise<string> {
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    const { data, error } = await sb.auth.updateUser({ password: newPassword });
    if (error || !data.user) throw new AuthError("This reset link is invalid or has expired. Please request a new one.");
    return data.user.id;
  }
  const db = systemDb();
  const cred = token ? await db.selectOne("local_credentials", { reset_token_hash: sha256(token) }) : null;
  if (!cred || !cred.reset_expires_at || Date.parse(cred.reset_expires_at) < Date.now()) {
    throw new AuthError("This reset link is invalid or has expired. Please request a new one.");
  }
  await db.update("local_credentials", { id: cred.id }, {
    password_hash: await hashPassword(newPassword),
    reset_token_hash: null,
    reset_expires_at: null,
    // Clicking the emailed link also proves ownership of the address.
    verify_token_hash: null,
    verify_expires_at: null,
    password_changed_at: new Date().toISOString(),
  });
  await db.update("profiles", { id: cred.id }, { email_verified: true });
  await waitForNextSecond();
  await createSession(cred.id);
  return cred.id;
}

/** Change password while signed in (requires the current password). Signs out other sessions. */
export async function changePassword(userId: string, current: string, next: string) {
  if (!(await checkPassword(userId, current))) throw new AuthError("Your current password is incorrect.");
  if (env.backend === "supabase") {
    const sb = await supabaseUserClient();
    const { error } = await sb.auth.updateUser({ password: next });
    if (error) throw new AuthError(error.message);
    await sb.auth.signOut({ scope: "others" });
    return;
  }
  await systemDb().update("local_credentials", { id: userId }, {
    password_hash: await hashPassword(next),
    password_changed_at: new Date().toISOString(),
  });
  await waitForNextSecond();
  await createSession(userId); // keep this browser signed in, revoke all others
}

/** JWT iat has 1-second precision; make sure the fresh session is newer than password_changed_at. */
function waitForNextSecond() {
  return new Promise((r) => setTimeout(r, 1000 - (Date.now() % 1000) + 5));
}
