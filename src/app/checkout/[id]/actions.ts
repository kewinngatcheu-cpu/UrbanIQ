"use server";
import { redirect } from "next/navigation";
import { assertUser } from "@/lib/auth";
import { confirmDemoCheckout } from "@/lib/billing";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

export async function confirmCheckoutAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const user = await assertUser();
    await confirmDemoCheckout(user, fd(form, "id"));
  });
  if (res.error) return res;
  redirect("/app?upgraded=1");
}
