import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";
import { supabaseUserClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth";
import { isPlanId } from "@/lib/config/plans";

/** Supabase mode: email confirmation / PKCE code exchange. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/onboarding";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/onboarding";
  if (env.backend !== "supabase" || !code) return NextResponse.redirect(new URL("/login?error=verify", req.nextUrl.origin));
  const sb = await supabaseUserClient();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=verify", req.nextUrl.origin));
  const requested = data.user.user_metadata?.requested_plan;
  await ensureProfile(data.user.id, data.user.email ?? "", { verified: !!data.user.email_confirmed_at, requestedPlan: isPlanId(requested) ? requested : null });
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
