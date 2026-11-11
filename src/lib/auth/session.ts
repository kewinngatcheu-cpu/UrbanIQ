import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "jarvis_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userAgent: string | null): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.query(`INSERT INTO sessions (id, expires_at, user_agent, device_label) VALUES ($1,$2,$3,$4)`, [
    sha256(token), expiresAt, userAgent?.slice(0, 300) ?? null, deviceLabel(userAgent),
  ]);
  return { token, expiresAt };
}

export async function validateSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const db = await getDb();
  const rows = await db.query<{ id: string }>(
    `UPDATE sessions SET last_seen_at = now() WHERE id = $1 AND expires_at > now() RETURNING id`, [sha256(token)],
  );
  return rows.length === 1;
}

export async function deleteSession(token: string) {
  const db = await getDb();
  await db.query(`DELETE FROM sessions WHERE id = $1`, [sha256(token)]);
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return validateSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.JARVIS_SECURE_COOKIES === "true",
    path: "/",
    expires: expiresAt,
  });
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unbekannt";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  return "Browser";
}
