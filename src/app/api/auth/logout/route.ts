import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { SESSION_COOKIE, deleteSession } from "@/lib/auth/session";

export const POST = api(async (req) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}, { public: true });
