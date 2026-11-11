import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { archiveHabit, toggleCheckin } from "@/lib/discipline";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

/** Check in / undo for a day (today or the 6 days before). */
export const POST = api<Ctx>(async (req, { params }) => {
  const b = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), done: z.boolean() }).parse(await readJson(req));
  await toggleCheckin(uuid.parse((await params).id), b.day, b.done);
  return NextResponse.json({ ok: true });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await archiveHabit(uuid.parse((await params).id));
  return NextResponse.json({ ok: true });
});
