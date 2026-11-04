"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser, AuthError } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/auth/rate-limit";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

/**
 * Controlled switch between ONE Personal and ONE Business: users can only REQUEST it.
 * The platform owner reviews and approves it in /admin/users (audited). Data is never mixed.
 */
export async function requestAccountTypeSwitch(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await assertUser();
    if (!rateLimit(`switch:${user.id}`, 3, 24 * 3600 * 1000)) throw new AuthError("Too many requests. Please try again later.");
    const reason = z.string().trim().min(5, "Please describe briefly why you want to switch.").max(1000).parse(fd(form, "reason"));
    const to = user.account_type === "business" ? "personal" : "business";
    const company = to === "business" ? z.string().trim().min(2, "Please enter your company name.").max(120).parse(fd(form, "company")) : null;
    const db = systemDb();
    if ((await db.select("account_type_requests", { where: { user_id: user.id, status: "pending" } })).length) throw new AuthError("You already have an open request.");
    await db.insert("account_type_requests", { user_id: user.id, from_type: user.account_type, to_type: to, reason, company_name: company, status: "pending", decided_by: null, decided_at: null });
    await audit(user.id, "account.type_switch_requested", { type: "user", id: user.id }, { to });
    revalidatePath("/app/settings");
    revalidatePath("/business/settings");
    return { ok: true, message: "Request sent. We'll review it and let you know.", ts: Date.now() };
  });
}
