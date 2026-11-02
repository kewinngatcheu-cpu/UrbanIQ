"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState, type ActionState } from "@/lib/action-state";
import { confirmCheckoutAction } from "./actions";

export function ConfirmCheckout({ id, planName }: { id: string; planName: string }) {
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await confirmCheckoutAction(prev, form);
    // Full navigation from the callback: the page may re-render (new session cookie) before an effect could run.
    if (res.ok && typeof res.data?.target === "string") window.location.assign(res.data.target);
    return res;
  }, initialState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full" pendingText="Confirming…">Confirm demo payment & activate {planName}</SubmitButton>
      <Link href="/app" className="block text-center text-sm text-muted hover:text-ink">Not now — continue on Free</Link>
    </form>
  );
}

/** Stripe: the plan is activated by the signed webhook, not by this redirect. Poll until it arrives. */
export function AwaitPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 20) return;
    const t = setTimeout(() => { router.refresh(); setTries((n) => n + 1); }, 2000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return (
    <div className="text-center text-sm text-muted">
      {tries < 20 ? (
        <p className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin text-primary" /> Confirming your payment with Stripe…</p>
      ) : (
        <p>This is taking longer than usual. Your plan activates automatically as soon as Stripe confirms the payment — you can safely continue.</p>
      )}
      <Link href="/app" className="mt-4 block text-accent-strong hover:underline">Continue to ONE</Link>
    </div>
  );
}
