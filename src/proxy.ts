import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (formerly middleware): cheap session presence check + Supabase session refresh.
 * Real authorization (verified email, suspension, owner role) is enforced server-side
 * in layouts, pages and every server action — never only here.
 */
const PROTECTED = ["/app", "/business", "/admin", "/onboarding", "/checkout"];

function supabaseConfigured() {
  const forced = process.env.ONE_BACKEND;
  if (forced === "local") return false;
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && (forced === "supabase" || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

export async function proxy(req: NextRequest) {
  const isProtected = PROTECTED.some((p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + "/"));
  let res = NextResponse.next({ request: req });
  let hasSession = false;

  if (supabaseConfigured()) {
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getUser();
    hasSession = !!data.user;
  } else {
    hasSession = !!req.cookies.get("one_session")?.value;
  }

  // The admin area is invisible to anyone without a session (no redirect that would reveal it).
  if (!hasSession && (req.nextUrl.pathname === "/admin" || req.nextUrl.pathname.startsWith("/admin/"))) {
    return NextResponse.rewrite(new URL("/__not-found", req.url), { status: 404 });
  }
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
