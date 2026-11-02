"use client";
import { useT } from "@/components/i18n";
import { useActionState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { startCheckout, cancelPlan } from "../../_actions/settings";

export function UpgradeButtons({ plan, planName, price }: { plan: string; planName: string; price: string }) {
  const tr = useT();
  const [state, action] = useActionState(plan === "free" ? cancelPlan : startCheckout, initialState);
  return (
    <Card className="border-cloud shadow-glow">
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">{plan === "free" ? tr("Switch to Free") : tr("Continue with {plan}", { plan: planName })}</p>
          <p className="text-sm text-muted">{plan === "free" ? tr("Your paid features end immediately.") : tr("{price} per month · cancel anytime", { price })}</p>
          <FormMessage state={state} className="mt-2" />
        </div>
        <form action={action}>
          <input type="hidden" name="plan" value={plan} />
          <SubmitButton size="lg" pendingText={tr("One moment…")}>{plan === "free" ? tr("Switch to Free") : tr("Go to checkout")}</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
