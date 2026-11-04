"use client";
import { useActionState } from "react";
import { useT } from "@/components/i18n";
import { Input, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Card, CardBody } from "@/components/ui/card";
import { initialState } from "@/lib/action-state";
import { updateCompany, startBusinessCheckout } from "@/app/business/_actions/team";

const INDUSTRIES = ["Consulting & services", "Trade & retail", "Craft & construction", "IT & software", "Health & care", "Real estate", "Creative & media", "Education", "Other"];
const SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];

export function CompanyForm({ name, industry, size, canEdit }: { name: string; industry: string; size: string; canEdit: boolean }) {
  const tr = useT();
  const [state, action] = useActionState(updateCompany, initialState);
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-3">
        <Field label={tr("Company name")} htmlFor="co-name"><Input id="co-name" name="name" defaultValue={name} required maxLength={120} /></Field>
        <Field label={tr("Industry")} htmlFor="co-ind">
          <Select id="co-ind" name="industry" defaultValue={industry}><option value="">{tr("Please choose")}</option>{INDUSTRIES.map((i) => <option key={i} value={i}>{tr(i)}</option>)}</Select>
        </Field>
        <Field label={tr("Company size")} htmlFor="co-size">
          <Select id="co-size" name="size" defaultValue={size}><option value="">{tr("Please choose")}</option>{SIZES.map((i) => <option key={i} value={i}>{tr(i)}</option>)}</Select>
        </Field>
      </fieldset>
      <FormMessage state={state} />
      {canEdit && <SubmitButton pendingText={tr("Saving…")}>{tr("Save")}</SubmitButton>}
    </form>
  );
}

export function BizCheckout({ plan, planName, price }: { plan: string; planName: string; price: string }) {
  const tr = useT();
  const [state, action] = useActionState(startBusinessCheckout, initialState);
  return (
    <Card className="border-cloud shadow-glow">
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">{tr("Continue with {plan}", { plan: planName })}</p>
          <p className="text-sm text-muted">{tr("{price} per month for the whole company · cancel anytime", { price })}</p>
          <FormMessage state={state} className="mt-2" />
        </div>
        <form action={action}>
          <input type="hidden" name="plan" value={plan} />
          <SubmitButton size="lg" pendingText={tr("One moment…")}>{tr("Go to checkout")}</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
