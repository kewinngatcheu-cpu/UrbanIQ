import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { stopFocus } from "@/lib/discipline";

type Ctx = { params: Promise<{ id: string }> };

/** Stop the running session. */
export const PATCH = api<Ctx>(async (req, { params }) => {
  const b = z.object({ completed: z.boolean(), note: z.string().max(1000).optional(), taskDone: z.boolean().optional() }).parse(await readJson(req));
  return NextResponse.json(await stopFocus(z.string().uuid().parse((await params).id), b));
});
