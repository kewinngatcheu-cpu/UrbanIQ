import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { listAudit } from "@/lib/audit";

export const GET = api(async (req) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  return NextResponse.json({ entries: await listAudit(Number.isFinite(limit) ? limit : 100) });
});
