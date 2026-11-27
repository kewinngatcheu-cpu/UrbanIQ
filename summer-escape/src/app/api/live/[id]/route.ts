import { getDestination } from "@/lib/destinations/data";
import { isAdmin } from "@/lib/server/admin-auth";
import { getContext } from "@/lib/server/service";
import { liveResearch } from "@/lib/server/live";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Live research for one destination. Only for holders of a valid personal link
 * (header x-access-token) or the admin – so the public cannot use the app as a proxy.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const d = getDestination(id);
  if (!d) return json({ error: "not_found" }, 404);
  const token = req.headers.get("x-access-token") ?? "";
  const allowed = (token && (await getContext(token))) || (await isAdmin());
  if (!allowed) return json({ error: "unauthorized" }, 401);
  return json(await liveResearch(d));
}
