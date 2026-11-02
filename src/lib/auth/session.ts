import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/config/env";

/** Local-backend session cookie (signed HS256 JWT, httpOnly). */
export const SESSION_COOKIE = "one_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<{ userId: string; issuedAt: number } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { userId: payload.sub, issuedAt: (payload.iat ?? 0) * 1000 } : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
