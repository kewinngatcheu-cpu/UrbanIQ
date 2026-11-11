import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { updateSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { berlinDay } from "@/lib/time";

/** Manually entered balances (euros). No bank connection is made. */
export const PUT = api(async (req) => {
  const b = z.object({ liquid: z.number().min(-1e7).max(1e8).nullable(), saved: z.number().min(0).max(1e8).nullable() }).parse(await readJson(req));
  await updateSettings({
    financeLiquidCents: b.liquid == null ? null : Math.round(b.liquid * 100),
    financeSavedCents: b.saved == null ? null : Math.round(b.saved * 100),
    financeBalanceAsOf: berlinDay(),
  });
  await audit({ actor: "owner", action: "finance.balances.set", workspaceId: "personal", level: 3 });
  return NextResponse.json({ ok: true });
});
