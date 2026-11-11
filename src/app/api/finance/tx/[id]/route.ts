import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { deleteTransaction, updateTransactionCategory } from "@/lib/finance/service";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const PATCH = api<Ctx>(async (req, { params }) => {
  const { category } = z.object({ category: z.string().max(40) }).parse(await readJson(req));
  await updateTransactionCategory(uuid.parse((await params).id), category);
  return NextResponse.json({ ok: true });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  await deleteTransaction(uuid.parse((await params).id));
  return NextResponse.json({ ok: true });
});
