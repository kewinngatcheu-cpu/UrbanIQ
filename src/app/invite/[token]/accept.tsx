"use client";
import { useActionState } from "react";
import { useT } from "@/components/i18n";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { acceptInviteAction } from "./actions";

export function AcceptInvite({ token }: { token: string }) {
  const tr = useT();
  const [state, action] = useActionState(acceptInviteAction, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText={tr("Joining…")}>{tr("Accept invitation")}</SubmitButton>
    </form>
  );
}
