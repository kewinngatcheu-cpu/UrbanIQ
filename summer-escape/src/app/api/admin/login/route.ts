import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_MAX_AGE, adminConfigured, checkPassword, createSessionValue, loginBlocked } from "@/lib/server/admin-auth";
import { clientIp, json, readJson, sameOrigin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);
  if (!adminConfigured()) return json({ ok: false, error: "not_configured" }, 503);
  const ip = clientIp(req);
  if (loginBlocked(ip)) return json({ ok: false, error: "too_many_attempts" }, 429);
  let password = "";
  try {
    password = String(((await readJson(req, 2000)) as { password?: unknown }).password ?? "");
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  if (!checkPassword(ip, password)) return json({ ok: false, error: "invalid" }, 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
