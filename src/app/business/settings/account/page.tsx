import type { Metadata } from "next";
import { requireOrg } from "@/lib/org";
import { systemDb } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProfileForm, PasswordForm, FeedbackForm } from "@/app/app/settings/forms";
import { AccountSwitchForm } from "@/components/app/account-switch";

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getT();
  return { title: tr("Your account") };
}

export default async function BizAccount() {
  const ctx = await requireOrg();
  const tr = await getT();
  const pending = !!(await systemDb().selectOne("account_type_requests", { user_id: ctx.user.id, status: "pending" }));
  return (
    <div className="space-y-6">
      <Card><CardHeader title={tr("Profile")} /><CardBody><ProfileForm name={ctx.user.full_name ?? ""} email={ctx.user.email} /></CardBody></Card>
      <Card><CardHeader title={tr("Password")} description={tr("Changing it signs you out on all other devices.")} /><CardBody><PasswordForm /></CardBody></Card>
      {ctx.role === "owner" && (
        <Card>
          <CardHeader title={tr("Account type: ONE Business")} description={tr("Want to use ONE privately instead? A switch is reviewed by the ONE team. Company data stays with the company.")} />
          <CardBody><AccountSwitchForm to="personal" pending={pending} /></CardBody>
        </Card>
      )}
      <Card><CardHeader title={tr("Feedback")} description={tr("Tell us what you love, what's missing or what's broken. It goes straight to the ONE team.")} /><CardBody><FeedbackForm /></CardBody></Card>
    </div>
  );
}
