import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ShieldCheck, KeyRound } from "lucide-react";
import { requireAdmin, getMfa } from "@/lib/admin-guard";
import { otpauthUrl } from "@/lib/auth/totp";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/misc";
import { MfaForm } from "@/app/verify-owner/form";
import { StartMfa } from "./start";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Security") };
}

export default async function AdminSecurity() {
  const tr = await getT();
  const owner = await requireAdmin();
  const mfa = await getMfa();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Security")}</h1>
        <p className="text-sm text-muted">{tr("Protect the admin area with a second factor.")}</p>
      </div>
      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> {tr("Two-factor authentication (TOTP)")}</span>}
          action={<Badge tone={mfa.enabled ? "mint" : "peach"}>{mfa.enabled ? tr("Active") : tr("Off")}</Badge>} />
        <CardBody className="space-y-4">
          {mfa.enabled ? (
            <>
              <p className="text-[13.5px] text-muted">{tr("Every new admin session asks for a code from your authenticator app (valid for 12 hours).")}</p>
              <div className="max-w-sm"><MfaForm mode="disable" /></div>
            </>
          ) : mfa.pending ? (
            <>
              <p className="text-[13.5px] text-muted">{tr("Add this key to your authenticator app (e.g. 1Password, Google Authenticator, Authy), then enter the current code.")}</p>
              <div className="space-y-2 rounded-xl border border-line bg-snow p-4">
                <p className="flex items-center gap-2 text-[12px] text-muted"><KeyRound className="size-3.5" /> {tr("Secret key")}</p>
                <code className="block break-all font-mono text-[15px] tracking-wider text-ink" data-testid="mfa-secret">{mfa.pending.replace(/(.{4})/g, "$1 ").trim()}</code>
                <a href={otpauthUrl(mfa.pending, owner.email)} className="inline-block text-[13px] font-medium text-accent-strong hover:underline">{tr("Open in authenticator app")}</a>
              </div>
              <div className="max-w-sm"><MfaForm mode="enrol" /></div>
            </>
          ) : (
            <>
              <Notice tone="peach">{tr("Recommended: turn on two-factor authentication for the owner account.")}</Notice>
              <StartMfa />
            </>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={tr("How owner access works")} />
        <CardBody className="space-y-2 text-[13.5px] leading-relaxed text-muted">
          <p>{tr("Owner rights come only from the server: ONE_OWNER_USER_ID must match your account AND your profile must carry the owner role, which can only be set by the server-side setup script.")}</p>
          <p>{tr("Registration never grants admin rights. /admin returns 404 for everyone else.")}</p>
          <p>{tr("Private and company content is not visible in the admin area. Support access requires a time-limited grant by the user and every view is logged.")}</p>
        </CardBody>
      </Card>
    </div>
  );
}
