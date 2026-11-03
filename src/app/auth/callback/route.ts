import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";
import { supabaseUserClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth";

/** Supabase mode: email confirmation / PKCE code exchange. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/onboarding";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/onboarding";
  if (env.backend !== "supabase" || !code) return NextResponse.redirect(new URL("/login?error=verify", req.nextUrl.origin));
  const sb = await supabaseUserClient();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=verify", req.nextUrl.origin));
  const meta = data.user.user_metadata ?? {};
  await ensureProfile(data.user.id, data.user.email ?? "", {
    verified: !!data.user.email_confirmed_at,
    requestedPlan: typeof meta.requested_plan === "string" ? meta.requested_plan : null,
    accountType: meta.account_type === "business" ? "business" : "personal",
    companyName: typeof meta.company_name === "string" ? meta.company_name : null,
  });
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
