import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { addMeasurement, addWorkout, fitnessOverview, METRICS, WORKOUT_TYPES } from "@/lib/lifestyle";

export const GET = api(async () => NextResponse.json({ ...(await fitnessOverview()), metrics: METRICS, types: WORKOUT_TYPES }));

export const POST = api(async (req) => {
  const raw = (await readJson(req)) as Record<string, unknown>;
  const { kind, ...rest } = z.object({ kind: z.enum(["workout", "measurement"]) }).passthrough().parse(raw);
  if (kind === "workout") return NextResponse.json(await addWorkout(rest as never), { status: 201 });
  await addMeasurement(rest as never);
  return NextResponse.json({ ok: true }, { status: 201 });
});
