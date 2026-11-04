"use server";
import { redirect } from "next/navigation";
import { assertUser } from "@/lib/auth";
import { acceptInvite } from "@/lib/org";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

export async function acceptInviteAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const user = await assertUser();
    await acceptInvite(user, fd(form, "token"));
  });
  if (res.error) return res;
  redirect("/business?joined=1");
}
