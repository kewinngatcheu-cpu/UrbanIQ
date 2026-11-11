import { NextResponse } from "next/server";
import { api, readJson } from "@/lib/http";
import { activeFocus, focusStats, recentFocus, startFocus } from "@/lib/discipline";

export const GET = api(async () =>
  NextResponse.json({ active: await activeFocus(), stats: await focusStats(), recent: await recentFocus(8), serverNow: new Date().toISOString() }));

export const POST = api(async (req) => NextResponse.json(await startFocus((await readJson(req)) as never), { status: 201 }));
