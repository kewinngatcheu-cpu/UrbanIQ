import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { addTransaction, financeOverview, listTransactions } from "@/lib/finance/service";
import { CATEGORIES } from "@/lib/finance/calc";

export const GET = api(async (req) => {
  const month = z.string().regex(/^\d{4}-\d{2}$/).optional().parse(req.nextUrl.searchParams.get("month") ?? undefined);
  const overview = await financeOverview();
  return NextResponse.json({ overview, transactions: await listTransactions({ month: month ?? overview.month }), categories: CATEGORIES });
});

export const POST = api(async (req) => NextResponse.json(await addTransaction((await readJson(req)) as never), { status: 201 }));
