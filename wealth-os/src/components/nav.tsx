"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight, CalendarCheck, CreditCard, Home, LayoutDashboard, Menu, PiggyBank, Plug, Repeat, Settings, Sparkles, Target, TrendingUp, Wallet, X,
} from "lucide-react";
import { cx } from "./ui";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/transactions", label: "Transaktionen", icon: ArrowLeftRight },
  { href: "/recurring", label: "Fixkosten & Abos", icon: Repeat },
  { href: "/wealth", label: "Vermögen", icon: PiggyBank },
  { href: "/property", label: "Immobilie", icon: Home },
  { href: "/forecast", label: "Prognose", icon: TrendingUp },
  { href: "/intelligence", label: "Intelligence", icon: Sparkles },
  { href: "/monthly", label: "Monats-Check", icon: CalendarCheck },
  { href: "/debts", label: "Schulden", icon: CreditCard },
  { href: "/goals", label: "Ziele", icon: Target },
  { href: "/integrations", label: "Integrationen", icon: Plug },
  { href: "/settings", label: "Einstellungen", icon: Settings },
] as const;

const MOBILE = ["/", "/budget", "/wealth", "/property"];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 lg:flex" aria-label="Hauptnavigation">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">W</span>
        <span className="text-[15px] font-semibold tracking-tight">Wealth OS</span>
      </Link>
      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cx(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                isActive(path, href) ? "bg-surface-2 font-medium text-text" : "text-text-2 hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="px-2 text-[11px] leading-snug text-muted">Daten lokal gespeichert (IndexedDB). Keine Anlage- oder Finanzierungsberatung.</p>
    </nav>
  );
}

export function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden" aria-label="Navigation">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={cx("flex flex-col items-center gap-0.5 py-2 text-[10px]", isActive(path, href) ? "text-accent" : "text-muted")}>
                <Icon size={21} strokeWidth={1.8} aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => setOpen(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[10px] text-muted" aria-label="Mehr Bereiche">
              <Menu size={21} strokeWidth={1.8} aria-hidden />
              Mehr
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="pb-safe animate-in absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Alle Bereiche</span>
              <button onClick={() => setOpen(false)} aria-label="Schließen" className="p-1 text-muted">
                <X size={18} />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2">
              {NAV.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cx("flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center text-[11px]", isActive(path, href) ? "bg-surface-2 text-text" : "text-text-2")}
                  >
                    <Icon size={20} strokeWidth={1.8} aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileTopBar() {
  return (
    <div className="mb-4 flex items-center gap-2 lg:hidden">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-xs font-bold text-white">W</span>
      <span className="text-sm font-semibold">Wealth OS</span>
    </div>
  );
}
