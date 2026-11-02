"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { confirmCheckoutAction } from "./actions";

export function ConfirmCheckout({ id, planName }: { id: string; planName: string }) {
  const [state, action] = useActionState(confirmCheckoutAction, initialState);
  useEffect(() => {
    if (state.ok && typeof state.data?.target === "string") window.location.assign(state.data.target);
  }, [state.ok, state.data?.target]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="Confirming…">Confirm demo payment & activate {planName}</SubmitButton>
      <Link href="/app" className="block text-center text-sm text-muted hover:text-ink">Not now — continue on Free</Link>
    </form>
  );
}
