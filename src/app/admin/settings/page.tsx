import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import { getFlags } from "@/lib/features";
import { trialDays } from "@/lib/org";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toggleFlag } from "../actions";
import { PlatformSettingsForm } from "../forms";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Settings") };
}

export default async function AdminSettings() {
  const tr = await getT();
  await requireAdmin();
  const [flags, days, branding] = await Promise.all([getFlags(), trialDays(), systemDb().selectOne("platform_settings", { key: "branding" })]);
  const b = (branding?.value ?? {}) as { tagline?: string; supportEmail?: string };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("System settings")}</h1>
        <p className="text-sm text-muted">{tr("Platform-wide settings. Every change is written to the audit log.")}</p>
      </div>
      <Card>
        <CardHeader title={tr("Maintenance mode")} description={tr("When on, everyone except you can sign in and read, but not change data.")} />
        <CardBody className="flex items-center justify-between gap-4">
          <Badge tone={flags.maintenance_mode ? "peach" : "mint"}>{flags.maintenance_mode ? tr("On") : tr("Off")}</Badge>
          <form action={toggleFlag}>
            <input type="hidden" name="key" value="maintenance_mode" />
            <input type="hidden" name="enabled" value={String(!flags.maintenance_mode)} />
            <button role="switch" aria-checked={flags.maintenance_mode} aria-label={tr("Maintenance mode")} className={cn("relative h-6 w-11 rounded-full transition", flags.maintenance_mode ? "bg-accent" : "bg-cloud/60")}>
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", flags.maintenance_mode ? "left-[22px]" : "left-0.5")} />
            </button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={tr("Platform")} description={tr("Business trial length, branding and support contact")} />
        <CardBody><PlatformSettingsForm trialDays={days} tagline={b.tagline ?? ""} supportEmail={b.supportEmail ?? ""} /></CardBody>
      </Card>
      <Card>
        <CardHeader title={tr("AI configuration")} description={tr("Set via server environment variables — keys are never shown or stored in the browser.")} />
        <CardBody className="space-y-2 text-[13.5px]">
          <p className="flex justify-between gap-3"><span className="text-muted">{tr("Mode")}</span><Badge tone={env.aiMode === "anthropic" ? "mint" : "lavender"}>{env.aiMode === "anthropic" ? tr("Connected") : tr("Demo mode")}</Badge></p>
          <p className="flex justify-between gap-3"><span className="text-muted">{tr("Model")}</span><span className="font-mono text-[12.5px] text-ink">{env.aiModel}</span></p>
          <p className="flex justify-between gap-3"><span className="text-muted">ANTHROPIC_API_KEY</span><span className="text-ink">{env.anthropicApiKey ? tr("set") : tr("not set")}</span></p>
          <p className="pt-1 text-[12.5px] text-muted">{tr("AI kill switch and request limits per plan:")} <Link href="/admin/features" className="text-accent-strong hover:underline">{tr("Product")}</Link> · <Link href="/admin/plans" className="text-accent-strong hover:underline">{tr("Plans & prices")}</Link></p>
        </CardBody>
      </Card>
    </div>
  );
}
