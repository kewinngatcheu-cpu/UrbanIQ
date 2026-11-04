"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Briefcase, Users } from "lucide-react";
import { useLocale, useT } from "@/components/i18n";
import { Input, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState, type ActionState } from "@/lib/action-state";
import { formatPrice } from "@/lib/config/plans";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import type { OrgRole } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { completeBusinessSetup } from "./actions";
import type { FlowPlan } from "./flow";

const INDUSTRIES = ["Consulting & services", "Trade & retail", "Craft & construction", "IT & software", "Health & care", "Real estate", "Creative & media", "Education", "Other"];
const SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];

export function BusinessSetup({ invite, company, requestedPlan, plans, trialDays }: {
  invite: { org: string; role: OrgRole } | null;
  company: string;
  requestedPlan: string;
  plans: FlowPlan[];
  trialDays: number;
}) {
  const tr = useT();
  const locale = useLocale();
  const [plan, setPlan] = useState(plans.some((p) => p.id === requestedPlan) ? requestedPlan : plans[0]?.id);
  const [state, action] = useActionState(async (prev: ActionState, form: FormData) => {
    const res = await completeBusinessSetup(prev, form);
    if (res.ok && typeof res.data?.target === "string") window.location.assign(res.data.target);
    return res;
  }, initialState);

  if (invite) {
    return (
      <form action={action} className="animate-fade-up space-y-6 rounded-3xl border border-line bg-white/90 p-8 shadow-lift">
        <input type="hidden" name="mode" value="join" />
        <div className="flex size-12 items-center justify-center rounded-2xl bg-mist text-accent"><Users className="size-5" /></div>
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-accent-strong">ONE BUSINESS</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{tr("Join {company}", { company: invite.org })}</h1>
          <p className="mt-2 text-[15px] text-muted">{tr("You were invited as {role}.", { role: tr(ROLE_LABELS[invite.role]) })}</p>
        </div>
        <Field label={tr("Your name")} htmlFor="name"><Input id="name" name="name" maxLength={80} required autoFocus placeholder={tr("Your first and last name")} /></Field>
        <FormMessage state={state} />
        <SubmitButton size="lg" className="w-full" pendingText={tr("Joining…")}>{tr("Join the team")} <ArrowRight /></SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="animate-fade-up space-y-6 rounded-3xl border border-line bg-white/90 p-6 shadow-lift sm:p-10">
      <input type="hidden" name="plan" value={plan} />
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white"><Briefcase className="size-5" /></div>
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-accent-strong">ONE BUSINESS</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{tr("Set up your company workspace")}</h1>
          <p className="mt-1 text-[15px] text-muted">{tr("A private, isolated area for your company. Only people you invite can see it.")}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Your name")} htmlFor="name"><Input id="name" name="name" maxLength={80} required placeholder={tr("Your first and last name")} /></Field>
        <Field label={tr("Company name")} htmlFor="company"><Input id="company" name="company" defaultValue={company} required maxLength={120} /></Field>
        <Field label={tr("Industry")} htmlFor="industry">
          <Select id="industry" name="industry" defaultValue="">
            <option value="">{tr("Please choose")}</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{tr(i)}</option>)}
          </Select>
        </Field>
        <Field label={tr("Company size")} htmlFor="size">
          <Select id="size" name="size" defaultValue="">
            <option value="">{tr("Please choose")}</option>
            {SIZES.map((i) => <option key={i} value={i}>{tr(i)}</option>)}
          </Select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink">{tr("Plan")}</legend>
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup">
          {plans.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={plan === p.id} onClick={() => setPlan(p.id)}
              className={cn("rounded-2xl border p-4 text-left transition", plan === p.id ? "border-primary bg-mist/70 shadow-[0_0_0_3px_rgba(187,223,255,0.6)]" : "border-line hover:border-cloud")}>
              <p className="text-[14px] font-semibold text-ink">{p.name}</p>
              <p className="text-[12.5px] text-muted">{formatPrice(p.priceMonthlyEur, locale)}{p.priceMonthlyEur ? tr("/mo") : ""}</p>
              <ul className="mt-2 space-y-0.5 text-[12px] text-muted">{p.bullets.slice(1, 4).map((b) => <li key={b}>· {tr(b)}</li>)}</ul>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{tr("Your company starts with a {days}-day free trial. No payment details needed now.", { days: trialDays })}</p>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText={tr("Setting up…")}>{tr("Create workspace")} <ArrowRight /></SubmitButton>
    </form>
  );
}
