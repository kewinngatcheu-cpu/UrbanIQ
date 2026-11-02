import { getT, getLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ProfileForm, FeedbackForm, PasswordForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Settings") };
}

export default async function AccountSettings() {
  const tr = await getT();
  const locale = await getLocale();
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={tr("Profile")} description={tr("Member since {date}", { date: formatDate(user.created_at, undefined, locale) })} />
        <CardBody><ProfileForm name={user.full_name ?? ""} email={user.email} /></CardBody>
      </Card>
      <Card>
        <CardHeader title={tr("Password")} description={tr("Changing it signs you out on all other devices.")} />
        <CardBody><PasswordForm /></CardBody>
      </Card>
      <Card>
        <CardHeader title={tr("Feedback")} description={tr("Tell us what you love, what's missing or what's broken. It goes straight to the ONE team.")} />
        <CardBody><FeedbackForm /></CardBody>
      </Card>
    </div>
  );
}
