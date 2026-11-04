import type { Metadata } from "next";
import { Lock, Building2 } from "lucide-react";
import { requireOrg } from "@/lib/org";
import { getT, getLocale } from "@/lib/i18n/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { CompanyForm } from "@/components/business/settings-ui";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Company settings") };
}

export default async function CompanySettings() {
  const ctx = await requireOrg();
  const tr = await getT();
  const locale = await getLocale();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Building2 className="size-4 text-accent" /> {tr("Company profile")}</span>}
          description={tr("Created {date} · your role: {role}", { date: formatDate(ctx.org.created_at, undefined, locale), role: tr(ROLE_LABELS[ctx.role]) })} />
        <CardBody><CompanyForm name={ctx.org.name} industry={ctx.org.industry ?? ""} size={ctx.org.size ?? ""} canEdit={ctx.can("org.manage")} /></CardBody>
      </Card>
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Lock className="size-4 text-accent" /> {tr("Data & privacy")}</span>} />
        <CardBody className="space-y-2 text-[13.5px] leading-relaxed text-muted">
          <p>{tr("Company data is stored in an isolated workspace. Every request is checked against your company and your role on the server.")}</p>
          <p>{tr("The ONE platform team cannot read your company content. Access for support only happens through a logged support process that a Business Owner approves.")}</p>
          <p>{tr("Personal ONE accounts and company workspaces are strictly separated — nothing is shared between them.")}</p>
        </CardBody>
      </Card>
      {!ctx.can("org.manage") && <Notice tone="blue">{tr("Only the Business Owner and Admins can change the company profile.")}</Notice>}
    </div>
  );
}
