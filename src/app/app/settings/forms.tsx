"use client";
import { useActionState, useEffect, useRef } from "react";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { updateProfile, sendFeedback, grantSupportAccess, deleteAccount, changePasswordAction } from "../_actions/settings";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfile, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="s-name"><Input id="s-name" name="full_name" defaultValue={name} maxLength={80} /></Field>
        <Field label="Email" htmlFor="s-email" hint="Contact support to change your email address."><Input id="s-email" value={email} disabled readOnly /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save</SubmitButton>
    </form>
  );
}

export function FeedbackForm() {
  const [state, action] = useActionState(sendFeedback, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ts, state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field label="Type" htmlFor="f-kind">
        <Select id="f-kind" name="kind" defaultValue="feedback" className="sm:w-60">
          <option value="feedback">General feedback</option>
          <option value="idea">Feature idea</option>
          <option value="bug">Something is broken</option>
        </Select>
      </Field>
      <Field label="Message" htmlFor="f-msg"><Textarea id="f-msg" name="message" required minLength={5} maxLength={5000} /></Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Sending…">Send feedback</SubmitButton>
    </form>
  );
}

export function SupportGrantForm() {
  const [state, action] = useActionState(grantSupportAccess, initialState);
  return (
    <form action={action} className="space-y-3">
      <Field label="Why does support need access?" htmlFor="g-reason"><Input id="g-reason" name="reason" required maxLength={500} placeholder="e.g. My uploaded PDF does not show up" /></Field>
      <Field label="Duration" htmlFor="g-hours">
        <Select id="g-hours" name="hours" defaultValue="24" className="sm:w-48">
          <option value="1">1 hour</option><option value="24">24 hours</option><option value="72">3 days</option>
        </Select>
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Granting…">Grant temporary access</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="space-y-3">
      <Field label='Type "DELETE" to confirm' htmlFor="d-confirm"><Input id="d-confirm" name="confirm_text" required autoComplete="off" /></Field>
      <Field label="Your password" htmlFor="d-pw"><Input id="d-pw" name="password" type="password" required autoComplete="current-password" /></Field>
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingText="Deleting…">Permanently delete my account</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ts, state.ok]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field label="Current password" htmlFor="pw-current"><Input id="pw-current" name="current_password" type="password" autoComplete="current-password" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="pw-new" hint="10+ characters, letters and numbers"><Input id="pw-new" name="new_password" type="password" autoComplete="new-password" required /></Field>
        <Field label="Repeat new password" htmlFor="pw-confirm"><Input id="pw-confirm" name="confirm_password" type="password" autoComplete="new-password" required /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Saving…">Change password</SubmitButton>
    </form>
  );
}
