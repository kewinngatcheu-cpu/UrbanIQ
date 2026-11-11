import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { runScenario } from "@/lib/finance/service";

const body = z.object({
  months: z.number().int().min(1).max(36).default(6),
  incomeChangePct: z.number().min(-100).max(1000).optional(),
  expenseChangePct: z.number().min(-100).max(1000).optional(),
  rentChange: z.number().min(-10000).max(10000).optional(),   // euros / month
  oneOff: z.number().min(-1_000_000).max(1_000_000).optional(), // euros, month 1
  savingsRatePct: z.number().min(0).max(100).nullish(),
});

export const POST = api(async (req) => {
  const b = body.parse(await readJson(req));
  return NextResponse.json(await runScenario({
    incomeChangePct: b.incomeChangePct, expenseChangePct: b.expenseChangePct,
    rentChangeCents: b.rentChange != null ? Math.round(b.rentChange * 100) : undefined,
    oneOffCents: b.oneOff != null ? Math.round(b.oneOff * 100) : undefined,
    savingsRatePct: b.savingsRatePct ?? null,
  }, b.months));
});
