import "server-only";
import { cookies } from "next/headers";
import { safeEqual, sign } from "./crypto";

export const ADMIN_COOKIE = "se_admin";
const SESSION_HOURS = 12;

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 10;
}

/* Best-effort brute-force protection (per server instance). */
const attempts = new Map<string, { count: number; until: number }>();

export function loginBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  return !!a && a.count >= 5 && a.until > Date.now();
}

function registerFailure(ip: string) {
  const a = attempts.get(ip);
  const count = (a && a.until > Date.now() ? a.count : 0) + 1;
  attempts.set(ip, { count, until: Date.now() + 15 * 60_000 });
}

export function checkPassword(ip: string, password: string): boolean {
  if (!adminConfigured() || loginBlocked(ip)) return false;
  const ok = safeEqual(password, process.env.ADMIN_PASSWORD as string);
  if (!ok) registerFailure(ip);
  else attempts.delete(ip);
  return ok;
}

export function createSessionValue(): string {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  const data = `admin.${exp}`;
  return `${data}.${sign(data)}`;
}

export function verifySessionValue(v: string | undefined): boolean {
  if (!v) return false;
  const i = v.lastIndexOf(".");
  if (i < 0) return false;
  const data = v.slice(0, i);
  const sig = v.slice(i + 1);
  if (!safeEqual(sig, sign(data))) return false;
  const exp = Number(data.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  return verifySessionValue(jar.get(ADMIN_COOKIE)?.value);
}

export const SESSION_MAX_AGE = SESSION_HOURS * 3600;
