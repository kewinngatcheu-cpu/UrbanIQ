"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertUser, AuthError, checkPassword, signOut, changePassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validation";
import { systemDb, userDb } from "@/lib/db";
import { createCheckout, cancelSubscription } from "@/lib/billing";
import { isPlanId } from "@/lib/config/plans";
import { audit } from "@/lib/audit";
import { deleteAccountData } from "@/lib/account";
import { rateLimit } from "@/lib/auth/rate-limit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import { env } from "@/lib/config/env";
import { supabaseServiceClient } from "@/lib/supabase/server";

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const name = z.string().trim().max(80).parse(fd(form, "full_name"));
    // Only whitelisted fields; role/plan/status are never accepted from the client.
    await systemDb().update("profiles", { id: user.id }, { full_name: name || null });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Profile updated.", ts: Date.now() };
  });
}

export async function startCheckout(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "";
  const res = await run(async () => {
    const user = await assertUser();
    const plan = fd(form, "plan");
    if (!isPlanId(plan) || plan === "free") throw new AuthError("Please choose a paid plan.");
    if (plan === user.plan) throw new AuthError("You're already on this plan.");
    target = (await createCheckout(user, plan)).url; // demo page or hosted Stripe Checkout
  });
  if (res.error) return res;
  redirect(target);
}

export async function cancelPlan(): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const when = await cancelSubscription(user);
    revalidatePath("/app", "layout");
    return {
      ok: true,
      message: when === "period_end" ? "Your plan will end at the close of the current billing period." : "Your plan was cancelled. You're now on Free.",
      ts: Date.now(),
    };
  });
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    if (!rateLimit(`pwchange:${user.id}`, 5, 15 * 60 * 1000)) throw new AuthError("Too many attempts. Please wait a few minutes.");
    const next = passwordSchema.parse(fd(form, "new_password"));
    if (next !== fd(form, "confirm_password")) throw new AuthError("The new passwords don't match.");
    await changePassword(user.id, fd(form, "current_password"), next);
    await audit(user.id, "auth.password_changed");
    return { ok: true, message: "Password changed. Other devices were signed out.", ts: Date.now() };
  });
}

export async function grantSupportAccess(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const reason = z.string().trim().min(5, "Please describe briefly why support needs access.").max(500).parse(fd(form, "reason"));
    const hours = [1, 24, 72].includes(Number(fd(form, "hours"))) ? Number(fd(form, "hours")) : 24;
    const db = await userDb(user.id);
    const g = await db.insert("support_access_grants", { reason, expires_at: new Date(Date.now() + hours * 3600 * 1000).toISOString(), revoked_at: null });
    await audit(user.id, "support_access.granted", { type: "user", id: user.id }, { grant_id: g.id, hours });
    revalidatePath("/app/settings/privacy");
    return { ok: true, message: `Support access granted for ${hours} hours.`, ts: Date.now() };
  });
}

export async function revokeSupportAccess(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    const db = await userDb(user.id);
    await db.update("support_access_grants", fd(form, "id"), { revoked_at: new Date().toISOString() });
    await audit(user.id, "support_access.revoked", { type: "user", id: user.id });
    revalidatePath("/app/settings/privacy");
  });
}

export async function deleteAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const user = await assertUser();
    if (fd(form, "confirm_text") !== "DELETE") throw new AuthError('Please type DELETE to confirm.');
    if (!rateLimit(`delete:${user.id}`, 5, 15 * 60 * 1000)) throw new AuthError("Too many attempts.");
    if (!(await checkPassword(user.id, fd(form, "password")))) throw new AuthError("Password is incorrect.");
    if (user.role === "owner") throw new AuthError("The owner account can't be deleted from the app.");
    await deleteAccountData(user.id);
    await audit(null, "account.deleted", { type: "user", id: user.id });
    await signOut();
    if (env.backend === "supabase") await supabaseServiceClient().auth.admin.deleteUser(user.id);
  });
  if (res.error) return res;
  redirect("/?deleted=1");
}

export async function sendFeedback(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    if (!rateLimit(`feedback:${user.id}`, 5, 60 * 60 * 1000)) throw new AuthError("Thanks! Please wait a bit before sending more.");
    const message = z.string().trim().min(5, "Please write a few words.").max(5000).parse(fd(form, "message"));
    const kind = (["feedback", "bug", "idea"] as const).find((k) => k === fd(form, "kind")) ?? "feedback";
    await systemDb().insert("feedback", { user_id: user.id, email: user.email, kind, message, status: "new" });
    return { ok: true, message: "Thank you — your feedback reached the ONE team.", ts: Date.now() };
  });
}
