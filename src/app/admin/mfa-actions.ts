"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertOwner, AuthError } from "@/lib/auth";
import { assertAdmin, getMfa, saveMfa, issueMfaCookie, clearMfaCookie } from "@/lib/admin-guard";
import { generateSecret, verifyTotp } from "@/lib/auth/totp";
import { rateLimit } from "@/lib/auth/rate-limit";
import { audit } from "@/lib/audit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

export async function verifyOwnerMfa(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const owner = await assertOwner();
    if (!rateLimit(`mfa:${owner.id}`, 6, 10 * 60 * 1000)) throw new AuthError("Too many attempts. Please wait a few minutes.");
    const mfa = await getMfa();
    if (!mfa.enabled || !mfa.secret) return;
    if (!verifyTotp(mfa.secret, fd(form, "code"))) {
      await audit(owner.id, "admin.mfa_failed", { type: "user", id: owner.id });
      throw new AuthError("That code is not correct.");
    }
    await issueMfaCookie(owner.id);
    await audit(owner.id, "admin.mfa_verified", { type: "user", id: owner.id });
  });
  if (res.error) return res;
  redirect("/admin");
}

/** Step 1: create a pending secret (shown once in /admin/security). */
export async function startMfaEnrolment(): Promise<ActionState> {
  return run(async () => {
    const owner = await assertAdmin();
    await saveMfa({ pending: generateSecret() });
    await audit(owner.id, "admin.mfa_enrolment_started", { type: "user", id: owner.id });
    revalidatePath("/admin/security");
  });
}

/** Step 2: prove the app works, then enable. */
export async function confirmMfaEnrolment(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertAdmin();
    const mfa = await getMfa();
    if (!mfa.pending) throw new AuthError("Start the setup first.");
    if (!verifyTotp(mfa.pending, fd(form, "code"))) throw new AuthError("That code is not correct.");
    await saveMfa({ secret: mfa.pending, pending: null, enabled: true });
    await issueMfaCookie(owner.id);
    await audit(owner.id, "admin.mfa_enabled", { type: "user", id: owner.id });
    revalidatePath("/admin/security");
    return { ok: true, message: "Two-factor authentication is active.", ts: Date.now() };
  });
}

export async function disableMfa(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertAdmin();
    const mfa = await getMfa();
    if (!mfa.enabled || !mfa.secret) throw new AuthError("Two-factor authentication is not active.");
    if (!verifyTotp(mfa.secret, fd(form, "code"))) throw new AuthError("That code is not correct.");
    await saveMfa({ secret: null, pending: null, enabled: false });
    await clearMfaCookie();
    await audit(owner.id, "admin.mfa_disabled", { type: "user", id: owner.id });
    revalidatePath("/admin/security");
    return { ok: true, message: "Two-factor authentication was turned off.", ts: Date.now() };
  });
}
