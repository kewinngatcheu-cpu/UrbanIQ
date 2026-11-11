import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { deleteGoal, updateGoal } from "@/lib/goals";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const PATCH = api<Ctx>(async (req, { params }) => {
  await updateGoal(uuid.parse((await params).id), (await readJson(req)) as never, "owner");
  return NextResponse.json({ ok: true });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteGoal(uuid.parse((await params).id), "owner");
  return NextResponse.json({ ok: true });
});
