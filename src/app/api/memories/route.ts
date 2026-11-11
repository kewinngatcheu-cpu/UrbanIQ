import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { createMemory, LAYERS, searchMemories, STATUSES, memoryStats } from "@/lib/memory/service";

const query = z.object({
  q: z.string().max(500).optional(),
  workspace: z.string().max(64).optional(),
  layer: z.enum(LAYERS).optional(),
  status: z.enum([...STATUSES, "all"]).optional(),
  pinned: z.enum(["true", "false"]).optional(),
});

export const GET = api(async (req) => {
  const p = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const memories = await searchMemories({ q: p.q, workspaceId: p.workspace, layer: p.layer, status: p.status, pinned: p.pinned === "true" });
  const stats = await memoryStats();
  return NextResponse.json({ memories, stats });
});

export const POST = api(async (req) => {
  const raw = (await readJson(req)) as Record<string, unknown>;
  const { allowDuplicate, ...input } = raw;
  const r = await createMemory({ ...(input as Record<string, unknown>), source: "user" } as never, "owner", { allowDuplicate: allowDuplicate === true });
  if (r.kind === "duplicate") return NextResponse.json({ error: "Sehr ähnlicher Eintrag existiert bereits.", duplicate: r.existing }, { status: 409 });
  return NextResponse.json(r, { status: 201 });
});
