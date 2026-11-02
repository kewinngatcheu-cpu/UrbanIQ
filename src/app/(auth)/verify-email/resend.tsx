"use client";
import { useActionState } from "react";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { resendAction } from "../actions";

export function ResendButton() {
  const [state, action] = useActionState(resendAction, initialState);
  return (
    <form action={action} className="space-y-3">
      <SubmitButton variant="secondary" className="w-full" pendingText="Sending…">Resend verification email</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
