import { NextResponse } from "next/server";
import { z } from "zod";
import { api, HttpError, readJson } from "@/lib/http";
import { deleteMemory, getMemory, getMemoryHistory, updateMemory } from "@/lib/memory/service";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const GET = api<Ctx>(async (_req, { params }) => {
  const id = uuid.parse((await params).id);
  const memory = await getMemory(id);
  if (!memory) throw new HttpError(404, "Erinnerung nicht gefunden.");
  return NextResponse.json({ memory, history: await getMemoryHistory(id) });
});

export const PATCH = api<Ctx>(async (req, { params }) => {
  const id = uuid.parse((await params).id);
  const memory = await updateMemory(id, (await readJson(req)) as never, "owner");
  return NextResponse.json({ memory });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteMemory(uuid.parse((await params).id), "owner");
  return NextResponse.json({ ok: true });
});
