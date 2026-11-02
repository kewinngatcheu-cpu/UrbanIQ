"use client";
import { useActionState } from "react";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState, type ActionState } from "@/lib/action-state";
import { resetPasswordAction } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await resetPasswordAction(prev, form);
    // Full navigation from the callback: the page may re-render (new session cookie) before an effect could run.
    if (res.ok && typeof res.data?.target === "string") window.location.assign(res.data.target);
    return res;
  }, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters with letters and numbers.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field label="Repeat new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
