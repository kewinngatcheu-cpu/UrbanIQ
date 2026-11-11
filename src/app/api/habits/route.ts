import { NextResponse } from "next/server";
import { api, readJson } from "@/lib/http";
import { createHabit, listHabits } from "@/lib/discipline";

export const GET = api(async () => NextResponse.json({ habits: await listHabits() }));
export const POST = api(async (req) => NextResponse.json(await createHabit((await readJson(req)) as never), { status: 201 }));
