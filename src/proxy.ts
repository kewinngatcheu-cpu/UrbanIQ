import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap first gate (no DB access here – the embedded database must only be opened by the app server):
 * page requests without a session cookie go straight to /login. Real validation happens in
 * requireOwner() (pages) and api() (API routes).
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.get("jarvis_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, auth pages, Next internals and public assets.
  matcher: ["/((?!api|login|setup|_next|icon.svg|manifest.webmanifest|favicon.ico).*)"],
};
