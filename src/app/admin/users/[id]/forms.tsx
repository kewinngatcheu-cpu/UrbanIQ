"use client";
import { useT } from "@/components/i18n";
import { useActionState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { setUserPlan, setUserStatus } from "../../actions";

export function UserAdminForms({ id, status, plan, plans, business }: { id: string; status: "active" | "suspended"; plan: string; plans: { id: string; name: string }[]; business?: boolean }) {
  const tr = useT();
  const [planState, planAction] = useActionState(setUserPlan, initialState);
  const [statusState, statusAction] = useActionState(setUserStatus, initialState);
  return (
    <div className="space-y-6">
      {!business && <Card>
        <CardHeader title={tr("Membership")} description={tr("Grants are complimentary and logged.")} />
        <CardBody>
          <form action={planAction} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <Field label={tr("Plan")} htmlFor="ap-plan">
              <Select id="ap-plan" name="plan" defaultValue={plan}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={tr("Reason")} htmlFor="ap-reason"><Input id="ap-reason" name="reason" required placeholder={tr("e.g. Beta tester")} /></Field>
            <FormMessage state={planState} />
            <SubmitButton className="w-full" pendingText={tr("Saving…")}>{tr("Update membership")}</SubmitButton>
          </form>
        </CardBody>
      </Card>}
      <Card>
        <CardHeader title={status === "active" ? tr("Suspend account") : tr("Reactivate account")} description={status === "active" ? tr("The user is signed out and can't log in.") : tr("The user can log in again.")} />
        <CardBody>
          <form action={statusAction} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={status === "active" ? "suspended" : "active"} />
            <Field label={tr("Reason")} htmlFor="as-reason"><Input id="as-reason" name="reason" required placeholder={tr("Logged in the audit trail")} /></Field>
            <FormMessage state={statusState} />
            <SubmitButton variant={status === "active" ? "danger" : "primary"} className="w-full" pendingText={tr("Saving…")}>{status === "active" ? tr("Suspend") : tr("Reactivate")}</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
