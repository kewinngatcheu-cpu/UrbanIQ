import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/misc";
import { SettingsTabs } from "@/app/app/settings/tabs";

const TABS = [
  { href: "/business/settings", label: "Company" },
  { href: "/business/settings/billing", label: "Plan & billing" },
  { href: "/business/settings/account", label: "Your account" },
];

export default async function BizSettingsLayout({ children }: { children: React.ReactNode }) {
  const tr = await getT();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={tr("Settings")} description={tr("Company profile, plan and your own account.")} />
      <SettingsTabs tabs={TABS} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
