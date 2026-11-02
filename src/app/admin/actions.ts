"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, AuthError } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { activatePlan } from "@/lib/billing";
import { audit } from "@/lib/audit";
import { FEATURE_FLAGS, setFlag, type FlagKey } from "@/lib/features";
import { isPlanId } from "@/lib/config/plans";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

/** Every admin action: server-side owner check first, audit log always. */

export async function setUserStatus(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = fd(form, "id");
    const status = fd(form, "status") === "suspended" ? "suspended" : "active";
    if (id === owner.id) throw new AuthError("You can't change your own status.");
    const reason = z.string().trim().min(3, "Please give a short reason (it's logged).").max(500).parse(fd(form, "reason"));
    const updated = await systemDb().update("profiles", { id }, { status });
    if (!updated.length) throw new AuthError("User not found.");
    await audit(owner.id, status === "suspended" ? "admin.user_suspended" : "admin.user_unsuspended", { type: "user", id }, { reason });
    revalidatePath("/admin", "layout");
    return { ok: true, message: status === "suspended" ? "User suspended." : "User reactivated.", ts: Date.now() };
  });
}

export async function setUserPlan(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = fd(form, "id");
    const plan = fd(form, "plan");
    if (!isPlanId(plan)) throw new AuthError("Unknown plan.");
    const reason = z.string().trim().min(3, "Please give a short reason (it's logged).").max(500).parse(fd(form, "reason"));
    if (!(await systemDb().selectOne("profiles", { id }))) throw new AuthError("User not found.");
    await activatePlan(id, plan, plan === "free" ? "none" : "admin_grant", null, owner.id);
    await audit(owner.id, "admin.plan_granted", { type: "user", id }, { plan, reason });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Membership updated.", ts: Date.now() };
  });
}

export async function toggleFlag(form: FormData) {
  const owner = await assertOwner();
  const key = fd(form, "key") as FlagKey;
  if (!(key in FEATURE_FLAGS)) return;
  const enabled = fd(form, "enabled") === "true";
  await setFlag(key, enabled);
  await audit(owner.id, "admin.feature_flag_changed", { type: "flag", id: key }, { enabled });
  revalidatePath("/admin", "layout");
}

export async function setFeedbackStatus(form: FormData) {
  const owner = await assertOwner();
  const status = (["new", "reviewed", "resolved"] as const).find((s) => s === fd(form, "status"));
  if (!status) return;
  await systemDb().update("feedback", { id: fd(form, "id") }, { status });
  await audit(owner.id, "admin.feedback_status", { type: "feedback", id: fd(form, "id") }, { status });
  revalidatePath("/admin/feedback");
}
