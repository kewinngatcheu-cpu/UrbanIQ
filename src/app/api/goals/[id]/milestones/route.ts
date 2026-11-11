import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { addMilestone } from "@/lib/goals";

type Ctx = { params: Promise<{ id: string }> };

export const POST = api<Ctx>(async (req, { params }) => {
  const id = z.string().uuid().parse((await params).id);
  const b = z.object({ title: z.string().min(1).max(200), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish() }).parse(await readJson(req));
  await addMilestone(id, b.title, b.dueDate ?? null);
  return NextResponse.json({ ok: true }, { status: 201 });
});
