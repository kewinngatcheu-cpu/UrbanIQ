import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { BLOCKER_REASONS, blockerPatterns, procrastinationCandidates, resolveProcrastination, type BlockerReason } from "@/lib/discipline";

export const GET = api(async () =>
  NextResponse.json({ candidates: await procrastinationCandidates(), patterns: await blockerPatterns(), reasons: BLOCKER_REASONS }));

export const POST = api(async (req) => {
  const b = z.object({
    taskId: z.string().uuid(),
    reason: z.enum(Object.keys(BLOCKER_REASONS) as [BlockerReason, ...BlockerReason[]]),
    nextStep: z.string().max(200).optional(),
  }).parse(await readJson(req));
  return NextResponse.json(await resolveProcrastination(b.taskId, b.reason, { nextStep: b.nextStep }));
});
