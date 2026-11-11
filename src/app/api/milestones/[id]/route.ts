import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { deleteMilestone, toggleMilestone } from "@/lib/goals";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const PATCH = api<Ctx>(async (req, { params }) => {
  const { done } = z.object({ done: z.boolean() }).parse(await readJson(req));
  await toggleMilestone(uuid.parse((await params).id), done);
  return NextResponse.json({ ok: true });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteMilestone(uuid.parse((await params).id));
  return NextResponse.json({ ok: true });
});
