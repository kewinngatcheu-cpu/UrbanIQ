import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { importCsv } from "@/lib/finance/service";

/** Body: { csv: string, dryRun: boolean }. The file is read in the browser and sent as text – nothing is stored except parsed bookings. */
export const POST = api(async (req) => {
  const b = z.object({ csv: z.string().min(1), dryRun: z.boolean().default(true) }).parse(await readJson(req, 2_500_000));
  return NextResponse.json(await importCsv(b.csv, b.dryRun));
});
