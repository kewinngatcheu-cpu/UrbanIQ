"use client";
import { useActionState } from "react";
import { useT } from "@/components/i18n";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { verifyOwnerMfa, confirmMfaEnrolment, disableMfa } from "@/app/admin/mfa-actions";

export function MfaForm({ mode }: { mode: "verify" | "enrol" | "disable" }) {
  const tr = useT();
  const fn = mode === "verify" ? verifyOwnerMfa : mode === "enrol" ? confirmMfaEnrolment : disableMfa;
  const [state, action] = useActionState(fn, initialState);
  return (
    <form action={action} className="space-y-3">
      <Field label={tr("Authenticator code")} htmlFor={`mfa-${mode}`}>
        <Input id={`mfa-${mode}`} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus={mode === "verify"} placeholder="123456" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" variant={mode === "disable" ? "danger" : "primary"} pendingText={tr("Checking…")}>
        {mode === "verify" ? tr("Continue") : mode === "enrol" ? tr("Activate two-factor authentication") : tr("Turn off two-factor authentication")}
      </SubmitButton>
    </form>
  );
}
