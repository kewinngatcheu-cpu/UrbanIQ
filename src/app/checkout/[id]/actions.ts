"use server";
import { assertUser, AuthError } from "@/lib/auth";
import { confirmDemoCheckout, getCheckout } from "@/lib/billing";
import { assertOrg } from "@/lib/org";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

export async function confirmCheckoutAction(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "/app?upgraded=1";
  const res = await run(async () => {
    const user = await assertUser();
    const co = await getCheckout(user, fd(form, "id"));
    if (co?.org_id) {
      // Company plans: only the Business Owner of that company may confirm.
      const ctx = await assertOrg("org.billing");
      if (ctx.org.id !== co.org_id) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
      target = "/business?upgraded=1";
    }
    await confirmDemoCheckout(user, fd(form, "id"));
  });
  if (res.error) return res;
  return { ok: true, data: { target }, ts: Date.now() };
}
