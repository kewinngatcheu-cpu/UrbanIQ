import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/lib/http";
import { deleteWorkout } from "@/lib/lifestyle";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteWorkout(z.string().uuid().parse((await params).id));
  return NextResponse.json({ ok: true });
});
