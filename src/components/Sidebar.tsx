"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { Icon } from "./Icon";
import { JarvisCore } from "./JarvisCore";

export function Sidebar({ ownerName }: { ownerName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Highlight only the most specific matching entry (e.g. /business/ngcx → NGCX, not also Business Portfolio).
  const matches = NAV_GROUPS.flatMap((g) => g.items).filter((it) => (it.href === "/" ? path === "/" : path === it.href || path.startsWith(it.href + "/")));
  const best = matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (href: string) => href === best;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-3 px-4 pt-4 pb-2" onClick={() => setOpen(false)}>
        <JarvisCore size={36} />
        <div>
          <div className="text-[15px] font-semibold tracking-[.18em]">JARVIS</div>
          <div className="text-[11px] text-muted">by {ownerName}</div>
        </div>
      </Link>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="mt-2.5">
            <div className="label px-3 pb-1.5">{g.label}</div>
            {g.items.map((it) => {
              const active = isActive(it.href);
              return (
                <Link key={it.slug} href={it.href} onClick={() => setOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-[5px] text-[13.5px] transition-colors ${
                    active ? "bg-blue/15 text-fg" : "text-muted hover:bg-ink-700/60 hover:text-fg"}`}>
                  <Icon name={it.icon} size={16} className={active ? "text-cyan" : "text-muted group-hover:text-cyan"} />
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.status === "planned" && <span className="text-[10px] text-muted/70">P{it.phase}</span>}
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_#37CFFF]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <button onClick={logout} className="mx-3 mb-3 mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-ink-700/60 hover:text-fg">
        <LogOut size={15} /> Abmelden
      </button>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-600/50 bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingTop: "max(.75rem, env(safe-area-inset-top))" }}>
        <Link href="/" className="flex items-center gap-2"><JarvisCore size={26} /><span className="text-sm font-semibold tracking-[.18em]">JARVIS</span></Link>
        <button aria-label="Menü öffnen" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-ink-700"><Menu size={20} /></button>
      </div>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-ink-600/40 bg-ink-900/80 backdrop-blur lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-ink-600/40 bg-ink-900" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <button aria-label="Menü schließen" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 hover:bg-ink-700" style={{ marginTop: "env(safe-area-inset-top)" }}><X size={18} /></button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
