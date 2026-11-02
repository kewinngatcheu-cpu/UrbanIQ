"use client";
import { useActionState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { initialState } from "@/lib/action-state";
import { PLANS, PLAN_ORDER } from "@/lib/config/plans";
import { setUserPlan, setUserStatus } from "../../actions";

export function UserAdminForms({ id, status, plan }: { id: string; status: "active" | "suspended"; plan: string }) {
  const [planState, planAction] = useActionState(setUserPlan, initialState);
  const [statusState, statusAction] = useActionState(setUserStatus, initialState);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Membership" description="Grants are complimentary and logged." />
        <CardBody>
          <form action={planAction} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <Field label="Plan" htmlFor="ap-plan">
              <Select id="ap-plan" name="plan" defaultValue={plan}>
                {PLAN_ORDER.map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}
              </Select>
            </Field>
            <Field label="Reason" htmlFor="ap-reason"><Input id="ap-reason" name="reason" required placeholder="e.g. Beta tester" /></Field>
            <FormMessage state={planState} />
            <SubmitButton className="w-full" pendingText="Saving…">Update membership</SubmitButton>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={status === "active" ? "Suspend account" : "Reactivate account"} description={status === "active" ? "The user is signed out and can't log in." : "The user can log in again."} />
        <CardBody>
          <form action={statusAction} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={status === "active" ? "suspended" : "active"} />
            <Field label="Reason" htmlFor="as-reason"><Input id="as-reason" name="reason" required placeholder="Logged in the audit trail" /></Field>
            <FormMessage state={statusState} />
            <SubmitButton variant={status === "active" ? "danger" : "primary"} className="w-full" pendingText="Saving…">{status === "active" ? "Suspend" : "Reactivate"}</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
