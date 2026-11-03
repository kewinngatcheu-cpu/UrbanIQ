import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { assertOwner, requireOwner, AuthError } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { env } from "@/lib/config/env";
import type { Profile } from "@/lib/db/types";

/**
 * Second factor for the platform owner. The TOTP secret lives in `platform_settings`
 * (service role only, never sent to a browser after enrolment). A verified login sets a
 * short-lived, signed, httpOnly cookie bound to the owner's id.
 */
export const MFA_COOKIE = "one_admin_mfa";
const KEY = "owner_mfa";
const TTL_H = 12;

export interface MfaState { enabled: boolean; secret: string | null; pending: string | null }

export async function getMfa(): Promise<MfaState> {
  const row = await systemDb().selectOne("platform_settings", { key: KEY });
  const v = row?.value ?? {};
  return { enabled: v.enabled === true && typeof v.secret === "string", secret: typeof v.secret === "string" ? v.secret : null, pending: typeof v.pending === "string" ? v.pending : null };
}

export async function saveMfa(next: Partial<MfaState>) {
  const db = systemDb();
  const row = await db.selectOne("platform_settings", { key: KEY });
  const value = { ...(row?.value ?? {}), ...next };
  if (row) await db.update("platform_settings", { key: KEY }, { value });
  else await db.insert("platform_settings", { key: KEY, value });
}

const secretKey = () => new TextEncoder().encode(`${env.sessionSecret}:admin-mfa`);

export async function issueMfaCookie(ownerId: string) {
  const token = await new SignJWT({ mfa: true }).setProtectedHeader({ alg: "HS256" }).setSubject(ownerId).setIssuedAt().setExpirationTime(`${TTL_H}h`).sign(secretKey());
  (await cookies()).set(MFA_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_H * 3600 });
}

export async function clearMfaCookie() {
  (await cookies()).delete(MFA_COOKIE);
}

async function cookieValid(ownerId: string) {
  const t = (await cookies()).get(MFA_COOKIE)?.value;
  if (!t) return false;
  try {
    const { payload } = await jwtVerify(t, secretKey());
    return payload.sub === ownerId && payload.mfa === true;
  } catch {
    return false;
  }
}

/** For the admin layout: the owner, and whether the second factor still has to be entered. */
export async function adminGate(): Promise<{ owner: Profile; needsMfa: boolean; mfaEnabled: boolean }> {
  const owner = await requireOwner();
  const mfa = await getMfa();
  return { owner, mfaEnabled: mfa.enabled, needsMfa: mfa.enabled && !(await cookieValid(owner.id)) };
}

/** For admin server actions and admin page data: owner AND (if enabled) a verified second factor. */
export async function assertAdmin(): Promise<Profile> {
  const owner = await assertOwner();
  const mfa = await getMfa();
  if (mfa.enabled && !(await cookieValid(owner.id))) throw new AuthError("Please confirm your authenticator code first.");
  return owner;
}

/** Page/layout variant: 404 for non-owners; unverified second factor → the owner verification page. */
export async function requireAdmin(): Promise<Profile> {
  const { owner, needsMfa } = await adminGate();
  if (needsMfa) redirect("/verify-owner");
  return owner;
}
