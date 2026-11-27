import { notFound, redirect } from "next/navigation";
import { getContext, getSharedResult } from "@/lib/server/service";
import { Reveal } from "@/components/results/reveal";

export const dynamic = "force-dynamic";

export default async function RevealPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getContext(token);
  if (!ctx) notFound();
  const view = await getSharedResult(token);
  if (!view) redirect(`/p/${token}`);
  return <Reveal view={view} token={token} />;
}
