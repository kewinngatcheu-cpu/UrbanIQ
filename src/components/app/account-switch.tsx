"use client";
import { useActionState } from "react";
import { useT } from "@/components/i18n";
import { Input, Field, Textarea } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { requestAccountTypeSwitch } from "@/app/app/_actions/account-type";

/** Request (not perform) a switch between ONE Personal and ONE Business. */
export function AccountSwitchForm({ to, pending }: { to: "personal" | "business"; pending: boolean }) {
  const tr = useT();
  const [state, action] = useActionState(requestAccountTypeSwitch, initialState);
  if (pending) return <p className="rounded-xl bg-mist px-3 py-2.5 text-[13px] text-accent-strong">{tr("Your request is being reviewed. You keep full access to your current account in the meantime.")}</p>;
  return (
    <form action={action} className="space-y-4">
      {to === "business" && <Field label={tr("Company name")} htmlFor="sw-company"><Input id="sw-company" name="company" required maxLength={120} /></Field>}
      <Field label={tr("Why do you want to switch?")} htmlFor="sw-reason"><Textarea id="sw-reason" name="reason" required minLength={5} maxLength={1000} className="min-h-20" /></Field>
      <FormMessage state={state} />
      {!state.ok && <SubmitButton variant="secondary" pendingText={tr("Sending…")}>{to === "business" ? tr("Request ONE Business") : tr("Request ONE Personal")}</SubmitButton>}
    </form>
  );
}
