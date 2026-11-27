import { getContext } from "@/lib/server/service";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Minimal status: own progress + whether the shared result is unlocked. Nothing about the partner. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const c = await getContext(token);
  if (!c) return json({ error: "not_found" }, 404);
  return json({ phase: c.phase, status: c.status, sharedReady: c.sharedReady });
}
