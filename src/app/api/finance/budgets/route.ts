import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { setBudget } from "@/lib/finance/service";

export const PUT = api(async (req) => {
  const b = z.object({ category: z.string().max(40), euros: z.number().min(0) }).parse(await readJson(req));
  await setBudget(b.category, b.euros);
  return NextResponse.json({ ok: true });
});
