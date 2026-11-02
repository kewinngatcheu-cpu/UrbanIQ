"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Stores the browser's timezone in a cookie so server-rendered dates match the user's local time. */
export function TzCookie({ current }: { current: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) {
      document.cookie = `one_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, router]);
  return null;
}
