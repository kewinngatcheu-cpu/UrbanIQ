import { submit } from "@/lib/server/service";
import { json, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Final submission – afterwards the answers are locked. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  const res = await submit(token, (body as { answers?: unknown })?.answers);
  if (!res.ok) return json(res, res.error === "not_found" ? 404 : 409);
  return json(res);
}
