"use client";
import { useActionState } from "react";
import { useT } from "@/components/i18n";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { startMfaEnrolment } from "../mfa-actions";

export function StartMfa() {
  const tr = useT();
  const [state, action] = useActionState(startMfaEnrolment, initialState);
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <SubmitButton pendingText={tr("One moment…")}>{tr("Set up two-factor authentication")}</SubmitButton>
    </form>
  );
}
