"use client";
import { useActionState, useState } from "react";
import { Copy, Check, UserPlus } from "lucide-react";
import { useT } from "@/components/i18n";
import { Input, Field, Select } from "@/components/ui/input";
import { SubmitButton, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { initialState } from "@/lib/action-state";
import { inviteMember, changeMemberRole } from "@/app/business/_actions/team";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions/roles";
import type { OrgRole } from "@/lib/db/types";

export function InviteForm({ roles }: { roles: Exclude<OrgRole, "owner">[] }) {
  const tr = useT();
  const [role, setRole] = useState<string>(roles.includes("employee") ? "employee" : roles[0]);
  const [state, action] = useActionState(inviteMember, initialState);
  const [copied, setCopied] = useState(false);
  const link = typeof state.data?.link === "string" ? state.data.link : null;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field label={tr("Email address")} htmlFor="inv-email"><Input id="inv-email" name="email" type="email" required autoComplete="off" placeholder="name@company.com" /></Field>
        <Field label={tr("Role")} htmlFor="inv-role">
          <Select id="inv-role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r} value={r}>{tr(ROLE_LABELS[r])}</option>)}</Select>
        </Field>
      </div>
      <p className="text-xs text-muted">{tr(ROLE_DESCRIPTIONS[role as OrgRole])}</p>
      <FormMessage state={state} />
      {link && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-snow p-2">
          <code className="min-w-0 flex-1 truncate px-2 text-[12.5px] text-ink" data-testid="invite-link">{link}</code>
          <Button type="button" size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <><Check /> {tr("Copied")}</> : <><Copy /> {tr("Copy")}</>}
          </Button>
        </div>
      )}
      <SubmitButton pendingText={tr("Inviting…")}><UserPlus /> {tr("Send invitation")}</SubmitButton>
    </form>
  );
}

export function RoleSelect({ memberId, role, roles }: { memberId: string; role: OrgRole; roles: Exclude<OrgRole, "owner">[] }) {
  const tr = useT();
  const [state, action] = useActionState(changeMemberRole, initialState);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={memberId} />
      <Select name="role" defaultValue={role} aria-label={tr("Role")} className="h-9 w-36 text-[13px]" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {roles.map((r) => <option key={r} value={r}>{tr(ROLE_LABELS[r])}</option>)}
      </Select>
      {state.error && <span className="text-xs text-rose-ink">{tr(state.error)}</span>}
    </form>
  );
}
