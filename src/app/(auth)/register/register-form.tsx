"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { formatPrice, type PlanId, type World } from "@/lib/config/plans";
import { useLocale } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { registerAction } from "../actions";

export function RegisterForm({ world, plans, initialPlan, invite }: {
  world: World;
  plans: { id: PlanId; name: string; priceMonthlyEur: number | null }[];
  initialPlan: PlanId;
  invite: { token: string; email: string } | null;
}) {
  const tr = useT();
  const locale = useLocale();
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
      <input type="hidden" name="world" value={world} />
      {invite && <input type="hidden" name="invite" value={invite.token} />}
      {world === "business" && !invite && (
        <Field label={tr("Company name")} htmlFor="company">
          <Input id="company" name="company" required maxLength={120} placeholder={tr("e.g. Ngatcheu Consulting")} autoComplete="organization" autoFocus />
        </Field>
      )}
      <Field label={tr(world === "business" ? "Work email" : "Email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={tr("you@example.com")} defaultValue={invite?.email} readOnly={!!invite} autoFocus={world === "personal"} />
      </Field>
      <Field label={tr("Password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder={tr("Create a strong password")} />
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {checks.map(([ok, label]) => (
            <span key={label} className={cn("inline-flex items-center gap-1 transition", ok ? "text-mint-ink" : "text-muted")}>
              <Check className="size-3" strokeWidth={3} /> {label}
            </span>
          ))}
        </div>
      </Field>
      {plans.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink">{tr("Choose your plan")}</legend>
          <input type="hidden" name="plan" value={plan} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={plan === p.id}
                onClick={() => setPlan(p.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  plan === p.id ? "border-primary bg-mist shadow-[0_0_0_3px_rgba(187,223,255,0.6)]" : "border-line bg-white hover:border-cloud",
                )}
              >
                <span className="block text-[13px] font-semibold text-ink">{p.name}</span>
                <span className="block text-xs text-muted">{formatPrice(p.priceMonthlyEur, locale)}{p.priceMonthlyEur !== null ? tr("/mo") : ""}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {world === "business"
              ? tr("Your company starts with a free trial of the chosen plan. You decide about payment later.")
              : plans.find((p) => p.id === plan)?.priceMonthlyEur === 0 ? tr("Free forever. Upgrade anytime.") : tr("You'll confirm the payment after verifying your email. Until then you start on Free.")}
          </p>
        </fieldset>
      )}
      <label className="flex items-start gap-2.5 text-[13px] text-muted">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 rounded border-line accent-[#438ed4]" required />
        <span>{tr("I agree to the")} <Link href="/terms" className="text-accent-strong hover:underline">{tr("Terms")}</Link> {tr("and the")} <Link href="/privacy" className="text-accent-strong hover:underline">{tr("Privacy Policy")}</Link>.</span>
      </label>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText={tr("Creating your account…")}>{tr("Create account")}</SubmitButton>
      <p className="text-center text-sm text-muted">
        {tr("Already have an account?")} <Link href="/login" className="font-medium text-accent-strong hover:underline">{tr("Sign in")}</Link>
      </p>
    </form>
  );
}
