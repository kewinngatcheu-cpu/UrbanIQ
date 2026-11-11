import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { deleteCourse, updateCourse } from "@/lib/lifestyle";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const PATCH = api<Ctx>(async (req, { params }) => {
  await updateCourse(uuid.parse((await params).id), (await readJson(req)) as never);
  return NextResponse.json({ ok: true });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteCourse(uuid.parse((await params).id));
  return NextResponse.json({ ok: true });
});
