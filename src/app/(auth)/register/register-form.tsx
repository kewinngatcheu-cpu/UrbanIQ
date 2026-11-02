"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { PLANS, PLAN_ORDER, formatPrice, type PlanId } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import { registerAction } from "../actions";

export function RegisterForm({ initialPlan }: { initialPlan: PlanId }) {
  const [state, action] = useActionState(registerAction, initialState);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [pw, setPw] = useState("");
  const checks = [
    [pw.length >= 10, "10+ characters"],
    [/[a-zA-Z]/.test(pw), "a letter"],
    [/[0-9]/.test(pw), "a number"],
  ] as const;
  return (
    <form action={action} className="space-y-5">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Create a strong password" />
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {checks.map(([ok, label]) => (
            <span key={label} className={cn("inline-flex items-center gap-1 transition", ok ? "text-mint-ink" : "text-muted")}>
              <Check className="size-3" strokeWidth={3} /> {label}
            </span>
          ))}
        </div>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink">Choose your plan</legend>
        <input type="hidden" name="plan" value={plan} />
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {PLAN_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={plan === id}
              onClick={() => setPlan(id)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition",
                plan === id ? "border-primary bg-mist shadow-[0_0_0_3px_rgba(187,223,255,0.6)]" : "border-line bg-white hover:border-cloud",
              )}
            >
              <span className="block text-[13px] font-semibold text-ink">{PLANS[id].name}</span>
              <span className="block text-xs text-muted">{formatPrice(PLANS[id].priceMonthlyEur)}/mo</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {plan === "free" ? "Free forever. Upgrade anytime." : "You'll confirm the payment after verifying your email. Until then you start on Free."}
        </p>
      </fieldset>
      <label className="flex items-start gap-2.5 text-[13px] text-muted">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 rounded border-line accent-[#438ed4]" required />
        <span>I agree to the <Link href="/terms" className="text-accent-strong hover:underline">Terms</Link> and the <Link href="/privacy" className="text-accent-strong hover:underline">Privacy Policy</Link>.</span>
      </label>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating your account…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-accent-strong hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
