import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ProfileForm, FeedbackForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

export default async function AccountSettings() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Profile" description={`Member since ${formatDate(user.created_at)}`} />
        <CardBody><ProfileForm name={user.full_name ?? ""} email={user.email} /></CardBody>
      </Card>
      <Card>
        <CardHeader title="Feedback" description="Tell us what you love, what's missing or what's broken. It goes straight to the ONE team." />
        <CardBody><FeedbackForm /></CardBody>
      </Card>
    </div>
  );
}
