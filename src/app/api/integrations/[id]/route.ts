import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { setConnectorEnabled } from "@/lib/integrations";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = api<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { enabled } = z.object({ enabled: z.boolean() }).parse(await readJson(req));
  await setConnectorEnabled(id, enabled);
  await audit({ actor: "owner", action: enabled ? "integration.enable" : "integration.disable", target: id, level: 3 });
  return NextResponse.json({ ok: true });
});
