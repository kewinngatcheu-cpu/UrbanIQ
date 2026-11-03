"use client";
import { useT } from "@/components/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/plans", label: "Plans & prices" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/features", label: "Product" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const tr = useT();
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-2 [scrollbar-width:none]" aria-label={tr("Admin")}>
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition", active ? "bg-mist font-medium text-accent-strong" : "text-muted hover:bg-fog hover:text-ink")}>
            {tr(i.label)}
          </Link>
        );
      })}
    </nav>
  );
}
