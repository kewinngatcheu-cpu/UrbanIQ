"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic } from "lucide-react";

/** Always-reachable "talk to JARVIS" button (hidden where voice is already on screen). */
export function FloatingVoice() {
  const path = usePathname();
  if (path === "/voice" || path === "/chat") return null;
  return (
    <Link href="/voice" aria-label="Mit JARVIS sprechen" title="Mit JARVIS sprechen"
      className="fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue to-cyan text-white shadow-[0_0_30px_-6px_rgba(55,207,255,.8)] transition-transform hover:scale-105"
      style={{ right: "max(1.25rem, env(safe-area-inset-right))", bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
      <Mic size={22} />
    </Link>
  );
}
