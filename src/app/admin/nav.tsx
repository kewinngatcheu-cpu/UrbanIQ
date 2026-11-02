"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-2" aria-label="Admin">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition", active ? "bg-mist font-medium text-accent-strong" : "text-muted hover:bg-fog hover:text-ink")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
