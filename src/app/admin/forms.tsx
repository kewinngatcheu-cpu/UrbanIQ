"use client";
import { useActionState } from "react";
import { useT } from "@/components/i18n";
import { Input, Field, Select, Textarea } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { initialState } from "@/lib/action-state";
import { setOrgStatus, setOrgPlan, decideAccountTypeRequest, savePlan, createPlan, savePlatformSettings } from "./actions";
import { FEATURE_LABELS, LIMIT_LABELS, LIMIT_KEYS, type Plan, type FeatureKey } from "@/lib/config/plans";

export function OrgAdminForms({ id, status, plan, plans }: { id: string; status: "active" | "suspended"; plan: string; plans: { id: string; name: string }[] }) {
  const tr = useT();
  const [ps, pa] = useActionState(setOrgPlan, initialState);
  const [ss, sa] = useActionState(setOrgStatus, initialState);
  return (
    <div className="space-y-6">
      <form action={pa} className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <p className="text-[15px] font-semibold text-ink">{tr("Company plan")}</p>
        <input type="hidden" name="id" value={id} />
        <Field label={tr("Plan")} htmlFor="op-plan"><Select id="op-plan" name="plan" defaultValue={plan}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label={tr("Mode")} htmlFor="op-mode"><Select id="op-mode" name="mode" defaultValue="grant"><option value="grant">{tr("Complimentary grant (active)")}</option><option value="trial">{tr("Trial")}</option></Select></Field>
        <Field label={tr("Reason")} htmlFor="op-reason"><Input id="op-reason" name="reason" required placeholder={tr("Logged in the audit trail")} /></Field>
        <FormMessage state={ps} />
        <SubmitButton className="w-full" pendingText={tr("Saving…")}>{tr("Update company plan")}</SubmitButton>
      </form>
      <form action={sa} className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <p className="text-[15px] font-semibold text-ink">{status === "active" ? tr("Suspend company") : tr("Reactivate company")}</p>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={status === "active" ? "suspended" : "active"} />
        <Field label={tr("Reason")} htmlFor="os-reason"><Input id="os-reason" name="reason" required placeholder={tr("Logged in the audit trail")} /></Field>
        <FormMessage state={ss} />
        <SubmitButton variant={status === "active" ? "danger" : "primary"} className="w-full" pendingText={tr("Saving…")}>{status === "active" ? tr("Suspend") : tr("Reactivate")}</SubmitButton>
      </form>
    </div>
  );
}

export function RequestDecision({ id }: { id: string }) {
  const tr = useT();
  const [state, action] = useActionState(decideAccountTypeRequest, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button name="decision" value="approve" size="sm">{tr("Approve")}</Button>
      <Button name="decision" value="reject" size="sm" variant="ghost">{tr("Reject")}</Button>
      <FormMessage state={state} />
    </form>
  );
}

export function PlanEditor({ plan, featureKeys }: { plan: Plan; featureKeys: FeatureKey[] }) {
  const tr = useT();
  const [state, action] = useActionState(savePlan, initialState);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={plan.id} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={tr("Name")} htmlFor={`n-${plan.id}`}><Input id={`n-${plan.id}`} name="name" defaultValue={plan.name} required maxLength={60} /></Field>
        <Field label={tr("Price / month (EUR)")} htmlFor={`p-${plan.id}`} hint={tr("Empty = price not set (not purchasable)")}>
          <Input id={`p-${plan.id}`} name="price" inputMode="decimal" defaultValue={plan.priceMonthlyEur === null ? "" : String(plan.priceMonthlyEur)} placeholder="—" />
        </Field>
        <Field label={tr("Sort order")} htmlFor={`s-${plan.id}`}><Input id={`s-${plan.id}`} name="sort" inputMode="numeric" defaultValue={String(plan.sort)} /></Field>
        <div className="flex flex-col justify-end gap-2 pb-1 text-[13.5px] text-ink">
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={plan.active} className="size-4 accent-[#438ed4]" /> {tr("Active (bookable)")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="highlight" defaultChecked={plan.highlight} className="size-4 accent-[#438ed4]" /> {tr("Highlight")}</label>
        </div>
      </div>
      <Field label={tr("Tagline")} htmlFor={`t-${plan.id}`}><Input id={`t-${plan.id}`} name="tagline" defaultValue={plan.tagline} maxLength={160} /></Field>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink">{tr("Limits (enforced on the server)")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {LIMIT_KEYS.map((k) => (
            <Field key={k} label={tr(LIMIT_LABELS[k])} htmlFor={`l-${plan.id}-${k}`}><Input id={`l-${plan.id}-${k}`} name={`limit_${k}`} inputMode="numeric" defaultValue={String(plan.limits[k])} /></Field>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink">{tr("Features")}</legend>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map((k) => (
            <label key={k} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink hover:bg-snow">
              <input type="checkbox" name={`feature_${k}`} defaultChecked={!!plan.features[k]} className="size-4 accent-[#438ed4]" /> {tr(FEATURE_LABELS[k])}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={tr("Bullet points (one per line, shown on pricing cards)")} htmlFor={`b-${plan.id}`}><Textarea id={`b-${plan.id}`} name="bullets" defaultValue={plan.bullets.join("\n")} className="min-h-28" /></Field>
      <FormMessage state={state} />
      <SubmitButton pendingText={tr("Saving…")}>{tr("Save plan")}</SubmitButton>
    </form>
  );
}

export function NewPlanForm() {
  const tr = useT();
  const [state, action] = useActionState(createPlan, initialState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
      <Field label={tr("Id")} htmlFor="np-id" hint={tr("e.g. business_enterprise")}><Input id="np-id" name="id" required pattern="[a-z][a-z0-9_]{2,30}" /></Field>
      <Field label={tr("Name")} htmlFor="np-name"><Input id="np-name" name="name" required maxLength={60} /></Field>
      <Field label={tr("World")} htmlFor="np-world"><Select id="np-world" name="world" defaultValue="business"><option value="personal">Personal</option><option value="business">Business</option></Select></Field>
      <SubmitButton pendingText={tr("Creating…")}>{tr("Create plan")}</SubmitButton>
      <div className="sm:col-span-4"><FormMessage state={state} /></div>
    </form>
  );
}

export function PlatformSettingsForm({ trialDays, tagline, supportEmail }: { trialDays: number; tagline: string; supportEmail: string }) {
  const tr = useT();
  const [state, action] = useActionState(savePlatformSettings, initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={tr("Business trial (days)")} htmlFor="ps-trial"><Input id="ps-trial" name="trialDays" inputMode="numeric" defaultValue={String(trialDays)} /></Field>
        <Field label={tr("Brand tagline")} htmlFor="ps-tag"><Input id="ps-tag" name="tagline" defaultValue={tagline} maxLength={120} /></Field>
        <Field label={tr("Support email")} htmlFor="ps-mail"><Input id="ps-mail" name="supportEmail" type="email" defaultValue={supportEmail} maxLength={120} /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText={tr("Saving…")}>{tr("Save settings")}</SubmitButton>
    </form>
  );
}
