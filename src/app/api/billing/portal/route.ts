import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPortalUrl } from "@/lib/billing";

/** POST-only redirect to the Stripe customer portal. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") return NextResponse.redirect(new URL("/login", req.nextUrl.origin), 303);
  try {
    return NextResponse.redirect(await createPortalUrl(user), 303);
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(new URL(`/app/settings/billing?error=${msg}`, req.nextUrl.origin), 303);
  }
}
