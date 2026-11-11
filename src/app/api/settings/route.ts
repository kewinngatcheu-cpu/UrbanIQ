import { NextResponse } from "next/server";
import { api, readJson } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/settings";
import { providerStatus } from "@/lib/ai/registry";
import { audit } from "@/lib/audit";

export const GET = api(async () => NextResponse.json({ settings: await getSettings(), providers: providerStatus() }));

export const PATCH = api(async (req) => {
  const patch = (await readJson(req)) as Record<string, unknown>;
  const settings = await updateSettings(patch as never);
  await audit({ actor: "owner", action: "settings.update", level: 3, details: { keys: Object.keys(patch) } });
  return NextResponse.json({ settings });
});
