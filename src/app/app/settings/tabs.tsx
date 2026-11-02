"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/settings", label: "Account" },
  { href: "/app/settings/billing", label: "Plan & billing" },
  { href: "/app/settings/privacy", label: "Privacy & data" },
];

export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-fog p-1" aria-label="Settings">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}
          className={cn("shrink-0 rounded-xl px-4 py-2 text-[13px] transition", path === t.href ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
