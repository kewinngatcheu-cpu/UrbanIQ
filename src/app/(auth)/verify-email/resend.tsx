"use client";
import { useT } from "@/components/i18n";
import { useActionState } from "react";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { resendAction } from "../actions";

export function ResendButton() {
  const tr = useT();
  const [state, action] = useActionState(resendAction, initialState);
  return (
    <form action={action} className="space-y-3">
      <SubmitButton variant="secondary" className="w-full" pendingText={tr("Sending…")}>{tr("Resend verification email")}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
