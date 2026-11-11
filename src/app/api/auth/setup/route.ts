import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { api, clientIp, HttpError, readJson } from "@/lib/http";
import { getDb } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rateLimit";
import { audit } from "@/lib/audit";
import { seedInitialData } from "@/lib/seed";

const body = z.object({ token: z.string().min(1), displayName: z.string().min(1).max(80), password: z.string().max(200) });

/** One-time owner creation. Requires JARVIS_SETUP_TOKEN so a fresh deployment cannot be claimed by strangers. */
export const POST = api(async (req) => {
  if (!rateLimit(`setup:${clientIp(req)}`, 5, 15 * 60_000).ok) throw new HttpError(429, "Zu viele Versuche.");
  const b = body.parse(await readJson(req));
  const expected = process.env.JARVIS_SETUP_TOKEN;
  if (!expected) throw new HttpError(503, "JARVIS_SETUP_TOKEN ist nicht gesetzt. Führe `npm run setup` aus.");
  const a = Buffer.from(b.token), e = Buffer.from(expected);
  if (a.length !== e.length || !timingSafeEqual(a, e)) throw new HttpError(403, "Setup-Token ist falsch.");
  const weak = validatePasswordStrength(b.password);
  if (weak) throw new HttpError(400, weak);
  const db = await getDb();
  const existing = await db.query(`SELECT 1 FROM owner`);
  if (existing.length) throw new HttpError(409, "JARVIS ist bereits eingerichtet.");
  await db.query(`INSERT INTO owner (display_name, password_hash) VALUES ($1,$2)`, [b.displayName, await hashPassword(b.password)]);
  await seedInitialData();
  await audit({ actor: "owner", action: "auth.setup", level: 3 });
  const s = await createSession(req.headers.get("user-agent"));
  await setSessionCookie(s.token, s.expiresAt);
  return NextResponse.json({ ok: true });
}, { public: true });
