import { NextResponse } from "next/server";
import { z } from "zod";
import { REPORT_INSTRUCTIONS, SYSTEM_PROMPT, getProvider } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 120;

const body = z.object({
  consent: z.literal(true),
  mode: z.enum(["report", "question"]),
  question: z.string().max(500).optional(),
  facts: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 60_000) return NextResponse.json({ error: "Anfrage zu groß." }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage oder fehlende Zustimmung." }, { status: 400 });
  const provider = getProvider();
  if (!provider) return NextResponse.json({ error: "Kein KI-Provider konfiguriert (AI_PROVIDER/ANTHROPIC_API_KEY in .env.local)." }, { status: 503 });
  const { mode, question, facts } = parsed.data;
  const user =
    mode === "report"
      ? `${REPORT_INSTRUCTIONS}\n\nFaktenblatt:\n${JSON.stringify(facts, null, 1)}`
      : `Beantworte diese Frage ausschließlich auf Basis des Faktenblatts. Wenn die Daten nicht reichen, sag genau, was fehlt.\n\nFrage: ${question ?? ""}\n\nFaktenblatt:\n${JSON.stringify(facts, null, 1)}`;
  try {
    const content = await provider.generate(SYSTEM_PROMPT, user);
    return NextResponse.json({ content, provider: provider.name, model: provider.model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `KI-Anfrage fehlgeschlagen: ${msg}` }, { status: 502 });
  }
}
