import { saveDraft } from "@/lib/server/service";
import { json, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Save the caller's own draft. Only possible while the survey is live and not yet submitted. */
export async function PUT(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  const res = await saveDraft(token, (body as { answers?: unknown })?.answers);
  if (!res.ok) return json(res, res.error === "not_found" ? 404 : 409);
  return json(res);
}
