import { NextResponse } from "next/server";
import { z } from "zod";
import { api, clientIp, HttpError, readJson } from "@/lib/http";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { audit } from "@/lib/audit";

export const POST = api(async (req) => {
  const rl = rateLimit(`login:${clientIp(req)}`, 8, 15 * 60_000);
  if (!rl.ok) throw new HttpError(429, `Zu viele Anmeldeversuche. Erneut in ${rl.retryAfterSec}s.`);
  const { password } = z.object({ password: z.string().max(200) }).parse(await readJson(req));
  const db = await getDb();
  const [owner] = await db.query<{ password_hash: string }>(`SELECT password_hash FROM owner`);
  if (!owner) throw new HttpError(409, "JARVIS ist noch nicht eingerichtet.");
  if (!(await verifyPassword(password, owner.password_hash))) {
    await audit({ actor: "unknown", action: "auth.login", status: "failed", details: { ip: clientIp(req) } });
    throw new HttpError(401, "Falsches Passwort.");
  }
  const s = await createSession(req.headers.get("user-agent"));
  await setSessionCookie(s.token, s.expiresAt);
  await audit({ actor: "owner", action: "auth.login", details: { ip: clientIp(req) } });
  return NextResponse.json({ ok: true });
}, { public: true });
