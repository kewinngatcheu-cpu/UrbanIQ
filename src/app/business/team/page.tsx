import type { Metadata } from "next";
import { Users, Mail, ShieldCheck } from "lucide-react";
import { requireOrgPage } from "@/lib/org";
import { systemDb } from "@/lib/db";
import { getT, getLocale } from "@/lib/i18n/server";
import { assignableRoles, canManageMember, ROLE_LABELS, ROLE_DESCRIPTIONS, ORG_ROLES } from "@/lib/permissions/roles";
import { PageHeader, Progress } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm";
import { InviteForm, RoleSelect } from "@/components/business/team-ui";
import { revokeInvite, removeMember } from "../_actions/team";
import { membersOf } from "../lib";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Team") };
}

const TONE = { owner: "blue", admin: "lavender", manager: "mint", employee: "gray", viewer: "outline" } as const;

export default async function TeamPage() {
  const ctx = await requireOrgPage("members.view");
  const tr = await getT();
  const locale = await getLocale();
  const [members, invites] = await Promise.all([
    membersOf(ctx),
    ctx.can("members.invite") ? systemDb().select("organization_invites", { where: { org_id: ctx.org.id }, order: { column: "created_at", ascending: false } }) : Promise.resolve([]),
  ]);
  const openInvites = invites.filter((i) => !i.accepted_at && !i.revoked_at && Date.parse(i.expires_at) > Date.now());
  const seats = ctx.ent.limits.members;
  const used = members.length + openInvites.length;
  const roles = assignableRoles(ctx.role);
  return (
    <div>
      <PageHeader title={tr("Team")} description={tr("Who works in {company} and what they are allowed to do.", { company: ctx.org.name })} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Users className="size-4 text-accent" /> {tr("Members")}</span>} description={tr("{used} of {seats} seats used (incl. open invitations)", { used, seats })} />
            <CardBody className="pt-3">
              <Progress value={(used / Math.max(1, seats)) * 100} className="mb-4" />
              <ul className="divide-y divide-line">
                {members.map((m) => {
                  const manageable = m.user_id !== ctx.user.id && ctx.can("members.manage") && canManageMember(ctx.role, m.role);
                  return (
                    <li key={m.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky to-cloud text-sm font-semibold text-accent-strong">{m.name.slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{m.name}{m.user_id === ctx.user.id && <span className="text-muted"> · {tr("you")}</span>}</p>
                        <p className="truncate text-[12.5px] text-muted">{m.email}</p>
                      </div>
                      {manageable ? (
                        <div className="flex items-center gap-1">
                          <RoleSelect memberId={m.id} role={m.role} roles={roles} />
                          <ConfirmAction action={removeMember} fields={{ id: m.id }} trigger={tr("Remove")} triggerVariant="ghost" danger title={tr("Remove {name}?", { name: m.name })} description={tr("They lose access to the company immediately. Their open tasks are reassigned to you; their content stays in the company.")} confirmLabel={tr("Remove")} />
                        </div>
                      ) : <Badge tone={TONE[m.role]}>{tr(ROLE_LABELS[m.role])}</Badge>}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
          {ctx.can("members.invite") && (
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><Mail className="size-4 text-accent" /> {tr("Invite someone")}</span>} description={tr("Invitations are valid for 7 days and only work for the invited email address.")} />
              <CardBody className="space-y-5">
                {used >= seats ? <p className="rounded-xl bg-peach/70 px-3 py-2 text-[13px] text-peach-ink">{tr("All seats of your plan are in use. Upgrade the company plan to invite more people.")}</p> : <InviteForm roles={roles} />}
                {openInvites.length > 0 && (
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-ink">{tr("Open invitations")}</p>
                    <ul className="divide-y divide-line rounded-xl border border-line">
                      {openInvites.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-[13px]">
                          <span className="min-w-0 flex-1 truncate text-ink">{i.email}</span>
                          <Badge tone="gray">{tr(ROLE_LABELS[i.role])}</Badge>
                          <span className="text-[12px] text-muted">{tr("until {date}", { date: formatDate(i.expires_at, undefined, locale) })}</span>
                          <ConfirmAction action={revokeInvite} fields={{ id: i.id }} trigger={tr("Revoke")} triggerVariant="ghost" danger title={tr("Revoke this invitation?")} confirmLabel={tr("Revoke")} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
        <aside>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> {tr("Roles")}</span>} description={tr("Permissions are checked on the server for every request.")} />
            <CardBody className="space-y-3 pt-3">
              {ORG_ROLES.map((r) => (
                <div key={r}>
                  <p className="text-[13.5px] font-medium text-ink">{tr(ROLE_LABELS[r])}{r === ctx.role && <span className="text-muted"> · {tr("your role")}</span>}</p>
                  <p className="text-[12.5px] leading-relaxed text-muted">{tr(ROLE_DESCRIPTIONS[r])}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
