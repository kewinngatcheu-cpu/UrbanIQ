import { isAdmin } from "@/lib/server/admin-auth";
import { adminOverview, adminRegenerate, adminResetAnswers, adminSetPhase } from "@/lib/server/service";
import { PARTICIPANTS, type ParticipantId } from "@/lib/server/store";
import { json, readJson, sameOrigin, siteOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Action = "start" | "pause" | "resetAnswers" | "regenerate";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);
  if (!(await isAdmin())) return json({ ok: false, error: "unauthorized" }, 401);
  let body: { action?: Action; participant?: string; confirm?: string };
  try {
    body = (await readJson(req, 2000)) as typeof body;
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  switch (body.action) {
    case "start":
      await adminSetPhase("live");
      break;
    case "pause":
      await adminSetPhase("setup");
      break;
    case "resetAnswers":
      if (body.confirm !== "RESET") return json({ ok: false, error: "confirm_required" }, 400);
      await adminResetAnswers();
      break;
    case "regenerate": {
      const targets = body.participant === "all" ? PARTICIPANTS.map((p) => p.id) : PARTICIPANTS.filter((p) => p.id === body.participant).map((p) => p.id);
      if (!targets.length) return json({ ok: false, error: "bad_participant" }, 400);
      const origin = siteOrigin(req);
      const links: { id: ParticipantId; name: string; url: string }[] = [];
      for (const id of targets) {
        const token = await adminRegenerate(id);
        links.push({ id, name: PARTICIPANTS.find((p) => p.id === id)!.name, url: `${origin}/p/${token}` });
      }
      return json({ ok: true, links, overview: await adminOverview() });
    }
    default:
      return json({ ok: false, error: "unknown_action" }, 400);
  }
  return json({ ok: true, overview: await adminOverview() });
}
