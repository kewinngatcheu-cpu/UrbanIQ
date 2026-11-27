import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * All secrets are derived from ONE environment variable: APP_SECRET.
 *  - token hashing key   (access links are stored only as HMAC hashes)
 *  - answer encryption   (AES-256-GCM, answers are never stored in plain text)
 *  - admin session key   (signed, httpOnly cookie)
 *
 * Changing APP_SECRET invalidates all links, sessions and makes stored answers unreadable.
 */

const DEV_FALLBACK = "dev-only-insecure-secret-change-me-for-production-0000";

export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_DEV_SECRET !== "1") {
    throw new Error("APP_SECRET is missing or shorter than 32 characters. See README → Deployment.");
  }
  return DEV_FALLBACK;
}

export function isUsingDevSecret(): boolean {
  const s = process.env.APP_SECRET;
  return !s || s.length < 32;
}

const keyCache = new Map<string, Buffer>();
function key(purpose: "token" | "answers" | "session"): Buffer {
  const cached = keyCache.get(purpose);
  if (cached) return cached;
  const k = Buffer.from(hkdfSync("sha256", appSecret(), "our-summer-escape-2027", purpose, 32));
  keyCache.set(purpose, k);
  return k;
}

/** Test hook – secrets are read once per process otherwise. */
export function _resetKeyCache() {
  keyCache.clear();
}

const b64u = (b: Buffer) => b.toString("base64url");

/** 256-bit random, URL-safe access token (43 chars). */
export function generateToken(): string {
  return b64u(randomBytes(32));
}

export function hashToken(token: string): string {
  return createHmac("sha256", key("token")).update(token).digest("hex");
}

/** Cheap shape check before touching the database. */
export function looksLikeToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function encryptJSON(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("answers"), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `v1.${b64u(iv)}.${b64u(cipher.getAuthTag())}.${b64u(ct)}`;
}

export function decryptJSON<T>(payload: string): T {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unsupported payload");
  const decipher = createDecipheriv("aes-256-gcm", key("answers"), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]);
  return JSON.parse(pt.toString("utf8")) as T;
}

export function sign(data: string): string {
  return createHmac("sha256", key("session")).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}
