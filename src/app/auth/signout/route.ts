import { NextResponse, type NextRequest } from "next/server";
import { signOut } from "@/lib/auth";

/** Used to clear the session for suspended accounts (cookies can't be modified in Server Components). */
export async function GET(req: NextRequest) {
  await signOut();
  const reason = req.nextUrl.searchParams.get("reason");
  return NextResponse.redirect(new URL(reason === "suspended" ? "/login?error=suspended" : "/", req.nextUrl.origin));
}
