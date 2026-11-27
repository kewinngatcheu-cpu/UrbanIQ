import { notFound } from "next/navigation";
import { DEMO_SCENARIOS, PERSONAS } from "@/lib/demo";
import { computeCouple } from "@/lib/engine/results";
import { Reveal } from "@/components/results/reveal";

export function generateStaticParams() {
  return DEMO_SCENARIOS.map((s) => ({ scenario: s.id }));
}

export default async function DemoReveal({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario } = await params;
  const s = DEMO_SCENARIOS.find((x) => x.id === scenario);
  if (!s) notFound();
  const view = computeCouple(PERSONAS[s.a].answers, PERSONAS[s.b].answers);
  return <Reveal view={view} demoLabel={s.title} />;
}
