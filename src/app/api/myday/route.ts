import { NextResponse } from "next/server";
import { z } from "zod";
import { api, HttpError, readJson } from "@/lib/http";
import { buildBriefing, dayStats, generateBriefingText, getDay, makePlan, planInput, recentReviews, saveBriefing, saveEvening, eveningInput } from "@/lib/myday";
import { berlinDay } from "@/lib/time";

export const maxDuration = 120;

export const GET = api(async () => {
  const today = berlinDay();
  const [briefing, stored, stats, reviews] = await Promise.all([buildBriefing(), getDay(today), dayStats(today), recentReviews(7)]);
  return NextResponse.json({ today, briefing, stored, stats, reviews });
});

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("briefing_ai") }),
  z.object({ action: z.literal("plan") }).extend(planInput.shape),
  z.object({ action: z.literal("evening"), withAI: z.boolean().default(true) }).extend(eveningInput.shape),
]);

export const POST = api(async (req) => {
  const a = action.parse(await readJson(req));
  if (a.action === "briefing_ai") {
    const b = await buildBriefing();
    const r = await generateBriefingText(b);
    if (!r) throw new HttpError(409, "Kein KI-Anbieter verbunden – das Daten-Briefing oben ist vollständig, nur die Ausformulierung fehlt.");
    await saveBriefing(b, r.text);
    return NextResponse.json({ text: r.text, model: r.model });
  }
  if (a.action === "plan") {
    const { action: _a, ...p } = a;
    return NextResponse.json({ plan: await makePlan(p) });
  }
  const { action: _a, withAI, ...e } = a;
  return NextResponse.json(await saveEvening(e, { withAI }));
});
