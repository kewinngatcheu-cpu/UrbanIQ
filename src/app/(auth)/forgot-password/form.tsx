"use client";
import { useT } from "@/components/i18n";
import { useActionState } from "react";
import { FlaskConical } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Notice } from "@/components/ui/misc";
import { initialState } from "@/lib/action-state";
import { forgotPasswordAction } from "../actions";

export function ForgotForm({ demo }: { demo: boolean }) {
  const tr = useT();
  const [state, action] = useActionState(forgotPasswordAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <Field label={tr("Email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={tr("you@example.com")} autoFocus />
      </Field>
      <FormMessage state={state} />
      {state.ok && demo && (
        <Notice tone="lavender"><FlaskConical /> {tr("Demo mode: no email service is connected. For security the reset link is not shown here — it was written to the server log.")}</Notice>
      )}
      <SubmitButton className="w-full" size="lg" pendingText={tr("Sending…")}>{tr("Send reset link")}</SubmitButton>
    </form>
  );
}
