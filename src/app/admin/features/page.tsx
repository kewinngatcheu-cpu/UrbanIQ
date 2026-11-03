import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { FEATURE_FLAGS, getFlags, type FlagKey } from "@/lib/features";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toggleFlag } from "../actions";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Product") };
}

const GROUPS: { title: string; keys: FlagKey[] }[] = [
  { title: "Platform", keys: ["registrations_open", "personal_signups", "business_signups", "maintenance_mode", "announcement_banner"] },
  { title: "Modules", keys: ["ai_assistant", "document_uploads", "business_module_projects"] },
  { title: "Beta", keys: ["voice_notes_preview"] },
];

const MODULES = [
  { name: "ONE Personal · Memory, Action, Life, Intelligence", state: "live" },
  { name: "ONE Business · Dashboard, Tasks, Projects, Memory, Action, Intelligence, Team", state: "live" },
  { name: "AI document analysis & text recognition", state: "live" },
  { name: "Voice transcription", state: "prepared" },
  { name: "Integrations (calendar, mail, accounting)", state: "prepared" },
  { name: "Business automations", state: "prepared" },
  { name: "Business reporting exports", state: "prepared" },
] as const;

export default async function AdminFeatures() {
  const tr = await getT();
  await requireAdmin();
  const flags = await getFlags();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{tr("Product")}</h1>
        <p className="text-sm text-muted">{tr("Modules, feature switches and beta features. Switches take effect immediately for everyone and are logged. Plan features are managed in")} <Link href="/admin/plans" className="text-accent-strong hover:underline">{tr("Plans & prices")}</Link>.</p>
      </div>
      {GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader title={tr(g.title)} />
          <CardBody className="divide-y divide-line/70 pt-2">
            {g.keys.map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="break-all font-mono text-[13px] text-ink">{k}</p>
                  <p className="text-[13px] text-muted">{tr(FEATURE_FLAGS[k].description)}</p>
                </div>
                <form action={toggleFlag} className="shrink-0">
                  <input type="hidden" name="key" value={k} />
                  <input type="hidden" name="enabled" value={String(!flags[k])} />
                  <button role="switch" aria-checked={flags[k]} aria-label={`Toggle ${k}`} className={cn("relative h-6 w-11 rounded-full transition", flags[k] ? "bg-accent" : "bg-cloud/60")}>
                    <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", flags[k] ? "left-[22px]" : "left-0.5")} />
                  </button>
                </form>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
      <Card>
        <CardHeader title={tr("Modules")} description={tr("What is live and what is prepared but not yet available")} />
        <CardBody className="divide-y divide-line/70 pt-2">
          {MODULES.map((m) => (
            <div key={m.name} className="flex items-center justify-between gap-3 py-3 text-[13.5px]">
              <span className="text-ink">{tr(m.name)}</span>
              <Badge tone={m.state === "live" ? "mint" : "lavender"}>{m.state === "live" ? tr("Live") : tr("Prepared")}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
