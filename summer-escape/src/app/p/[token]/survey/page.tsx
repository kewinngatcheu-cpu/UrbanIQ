import { notFound, redirect } from "next/navigation";
import { getContext, getOwnAnswers } from "@/lib/server/service";
import { LiveSurvey } from "@/components/participant/survey-client";

export const dynamic = "force-dynamic";

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await getContext(token);
  if (!ctx) notFound();
  if (ctx.status === "submitted" || ctx.phase !== "live") redirect(`/p/${token}`);
  const answers = (await getOwnAnswers(token)) ?? {};
  return (
    <main>
      <LiveSurvey token={token} name={ctx.name} initial={answers} />
    </main>
  );
}
