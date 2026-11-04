"use client";
import { useEffect } from "react";

/**
 * Fallback: keeps the timezone cookie current (the root layout's inline script sets it first).
 * Deliberately does NOT call router.refresh(): a refresh racing a server action stalls the action.
 */
export function TzCookie({ current }: { current: string | null }) {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) {
      document.cookie = `one_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [current]);
  return null;
}
