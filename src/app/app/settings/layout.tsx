import { PageHeader } from "@/components/ui/misc";
import { SettingsTabs } from "./tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" description="Your account, plan and privacy." />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
