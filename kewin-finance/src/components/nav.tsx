"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Landmark, PiggyBank, Plus, Receipt, Settings, Target, X } from "lucide-react";
import { cx } from "./ui";
import { useActions } from "./providers";

export const NAV = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/ausgaben", label: "Ausgaben", icon: Receipt },
  { href: "/sparziele", label: "Sparziele", icon: Target },
  { href: "/vermoegen", label: "Vermögen", icon: Landmark },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

const active = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-sm font-black text-white">K</span>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight">KEWIN FINANCE</div>
        <div className="text-[11px] text-muted">Disziplin schlägt Zufall</div>
      </div>
    </div>
  );
}

export function QuickActions({ onDone, className, tiles }: { onDone?: () => void; className?: string; tiles?: boolean }) {
  const open = useActions();
  const items = [
    { label: "Ausgabe hinzufügen", short: "Ausgabe", icon: Receipt, run: () => open({ type: "expense" }), primary: true },
    { label: "Geld sparen", short: "Sparen", icon: PiggyBank, run: () => open({ type: "save" }) },
    { label: "Sparziel erstellen", short: "Sparziel", icon: Target, run: () => open({ type: "goal" }) },
  ];
  if (tiles)
    return (
      <div className={cx("grid grid-cols-3 gap-2", className)}>
        {items.map(({ label, short, icon: Icon, run, primary }) => (
          <button
            key={label}
            onClick={run}
            aria-label={label}
            className={cx("flex h-20 flex-col items-center justify-center gap-1.5 rounded-3xl text-[13px] font-semibold transition active:scale-[0.97]", primary ? "bg-accent text-white" : "border border-border bg-surface")}
          >
            <Icon size={22} strokeWidth={2} />
            <span className="sm:hidden">+ {short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    );
  return (
    <div className={cx("grid gap-2", className)}>
      {items.map(({ label, icon: Icon, run, primary }) => (
        <button
          key={label}
          onClick={() => (onDone?.(), run())}
          className={cx(
            "flex h-14 items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-semibold transition active:scale-[0.98]",
            primary ? "bg-accent text-white" : "border border-border bg-surface text-text",
          )}
        >
          <Icon size={20} strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 lg:flex">
      <Logo />
      <nav aria-label="Hauptnavigation">
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition", active(path, href) ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2")}>
                <Icon size={19} strokeWidth={1.9} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <QuickActions className="mt-auto" />
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Schnellaktionen: Ausgabe hinzufügen, Geld sparen, Sparziel erstellen"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] right-4 z-40 grid h-16 w-16 place-items-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition active:scale-95 lg:hidden"
      >
        <Plus size={30} strokeWidth={2.4} />
      </button>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden" aria-label="Navigation">
        <ul className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={cx("flex flex-col items-center gap-1 pt-2.5 text-[10px] font-medium", active(path, href) ? "text-accent" : "text-muted")}>
                <Icon size={23} strokeWidth={active(path, href) ? 2.3 : 1.8} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)}>
          <div className="pb-safe animate-sheet absolute inset-x-0 bottom-0 rounded-t-[28px] bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-semibold">Was möchtest du eintragen?</span>
              <button onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-full bg-surface-2 p-1.5 text-muted">
                <X size={18} />
              </button>
            </div>
            <QuickActions onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export function MobileHeader() {
  return (
    <div className="mb-4 lg:hidden">
      <Logo />
    </div>
  );
}
