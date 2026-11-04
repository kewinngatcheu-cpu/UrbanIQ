import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPortalUrl } from "@/lib/billing";
import { assertOrg } from "@/lib/org";

/** POST-only redirect to the Stripe customer portal (personal, or the company with `scope=org`). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") return NextResponse.redirect(new URL("/login", req.nextUrl.origin), 303);
  const org = (await req.formData().catch(() => null))?.get("scope") === "org";
  const back = org ? "/business/settings/billing" : "/app/settings/billing";
  try {
    // Company billing requires the org.billing permission (owner only), checked server-side.
    const orgId = org ? (await assertOrg("org.billing")).org.id : null;
    return NextResponse.redirect(await createPortalUrl(user, orgId), 303);
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(new URL(`${back}?error=${msg}`, req.nextUrl.origin), 303);
  }
}
