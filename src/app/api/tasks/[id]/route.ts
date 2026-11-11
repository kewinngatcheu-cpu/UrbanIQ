import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { deleteTask, updateTask } from "@/lib/tasks";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const PATCH = api<Ctx>(async (req, { params }) => {
  const task = await updateTask(uuid.parse((await params).id), (await readJson(req)) as never, "owner");
  return NextResponse.json({ task });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteTask(uuid.parse((await params).id), "owner");
  return NextResponse.json({ ok: true });
});
