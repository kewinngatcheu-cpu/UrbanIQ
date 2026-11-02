import { NextResponse, type NextRequest } from "next/server";
import { verifyEmailToken, DEMO_VERIFY_COOKIE } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { env } from "@/lib/config/env";
import { rateLimit } from "@/lib/auth/rate-limit";

/** Local mode: email verification link target. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const base = req.nextUrl.origin;
  if (env.backend !== "local" || !token || !rateLimit(`verify:${ip}`, 20, 15 * 60 * 1000)) {
    return NextResponse.redirect(new URL("/login?error=verify", base));
  }
  const ok = await verifyEmailToken(token);
  if (!ok) return NextResponse.redirect(new URL("/login?error=verify", base));
  await audit(null, "auth.email_verified");
  const res = NextResponse.redirect(new URL("/onboarding", base));
  res.cookies.delete(DEMO_VERIFY_COOKIE);
  return res;
}
