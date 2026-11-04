import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/misc";
import { SettingsTabs } from "./tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const tr = await getT();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={tr("Settings")} description={tr("Your account, plan and privacy.")} />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
