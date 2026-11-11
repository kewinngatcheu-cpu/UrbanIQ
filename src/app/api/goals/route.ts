import { NextResponse } from "next/server";
import { api, readJson } from "@/lib/http";
import { createGoal, goalAlignment, listGoals } from "@/lib/goals";

export const GET = api(async (req) => {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  return NextResponse.json({ goals: await listGoals({ status }), alignment: await goalAlignment() });
});

export const POST = api(async (req) => NextResponse.json({ goal: await createGoal((await readJson(req)) as never, "owner") }, { status: 201 }));
