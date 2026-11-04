"use client";
import { useT } from "@/components/i18n";
import { useActionState, useEffect, useRef } from "react";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { updateProfile, sendFeedback, grantSupportAccess, deleteAccount, changePasswordAction } from "../_actions/settings";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const tr = useT();
  const [state, action] = useActionState(updateProfile, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Name")} htmlFor="s-name"><Input id="s-name" name="full_name" defaultValue={name} maxLength={80} /></Field>
        <Field label={tr("Email")} htmlFor="s-email" hint={tr("Contact support to change your email address.")}><Input id="s-email" value={email} disabled readOnly /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText={tr("Saving…")}>{tr("Save")}</SubmitButton>
    </form>
  );
}

export function FeedbackForm() {
  const tr = useT();
  const [state, action] = useActionState(sendFeedback, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ts, state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field label={tr("Type")} htmlFor="f-kind">
        <Select id="f-kind" name="kind" defaultValue="feedback" className="sm:w-60">
          <option value="feedback">{tr("General feedback")}</option>
          <option value="idea">{tr("Feature idea")}</option>
          <option value="bug">{tr("Something is broken")}</option>
        </Select>
      </Field>
      <Field label={tr("Message")} htmlFor="f-msg"><Textarea id="f-msg" name="message" required minLength={5} maxLength={5000} /></Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText={tr("Sending…")}>{tr("Send feedback")}</SubmitButton>
    </form>
  );
}

export function SupportGrantForm() {
  const tr = useT();
  const [state, action] = useActionState(grantSupportAccess, initialState);
  return (
    <form action={action} className="space-y-3">
      <Field label={tr("Why does support need access?")} htmlFor="g-reason"><Input id="g-reason" name="reason" required maxLength={500} placeholder={tr("e.g. My uploaded PDF does not show up")} /></Field>
      <Field label={tr("Duration")} htmlFor="g-hours">
        <Select id="g-hours" name="hours" defaultValue="24" className="sm:w-48">
          <option value="1">{tr("1 hour")}</option><option value="24">{tr("24 hours")}</option><option value="72">{tr("3 days")}</option>
        </Select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText={tr("Granting…")}>{tr("Grant temporary access")}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const tr = useT();
  const [state, action] = useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="space-y-3">
      <Field label={tr('Type "DELETE" to confirm')} htmlFor="d-confirm"><Input id="d-confirm" name="confirm_text" required autoComplete="off" /></Field>
      <Field label={tr("Your password")} htmlFor="d-pw"><Input id="d-pw" name="password" type="password" required autoComplete="current-password" /></Field>
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingText={tr("Deleting…")}>{tr("Permanently delete my account")}</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const tr = useT();
  const [state, action] = useActionState(changePasswordAction, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ts, state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field label={tr("Current password")} htmlFor="pw-current"><Input id="pw-current" name="current_password" type="password" autoComplete="current-password" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("New password")} htmlFor="pw-new" hint={tr("10+ characters, letters and numbers")}><Input id="pw-new" name="new_password" type="password" autoComplete="new-password" required /></Field>
        <Field label={tr("Repeat new password")} htmlFor="pw-confirm"><Input id="pw-confirm" name="confirm_password" type="password" autoComplete="new-password" required /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText={tr("Saving…")}>{tr("Change password")}</SubmitButton>
    </form>
  );
}
