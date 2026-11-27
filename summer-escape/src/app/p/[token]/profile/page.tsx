import { notFound, redirect } from "next/navigation";
import { getContext, getIndividualResult } from "@/lib/server/service";
import { ProfileView } from "@/components/results/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getContext(token);
  if (!ctx) notFound();
  const view = await getIndividualResult(token);
  if (!view) redirect(`/p/${token}`);
  return <ProfileView view={view} name={ctx.name} token={token} backHref={`/p/${token}`} />;
}
