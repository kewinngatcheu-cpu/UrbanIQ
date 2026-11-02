import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

/** The viewer's IANA timezone (set by <TzCookie/> in the browser), validated. */
export const getTz = cache(async (): Promise<string> => {
  const raw = (await cookies()).get("one_tz")?.value;
  if (raw) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: raw });
      return raw;
    } catch {}
  }
  return process.env.ONE_DEFAULT_TIMEZONE || "Europe/Berlin";
});

/** yyyy-mm-dd of an instant in the given timezone. */
export function dayKey(d: Date | string | number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmt(d: Date | string | number, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(new Date(d));
}

/** Hour of day in tz (for greetings). */
export function hourIn(tz: string, d = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d)) % 24;
}
