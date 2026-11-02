"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, CalendarDays, Home, Settings, Shield, Sparkles, Zap, LogOut, FlaskConical } from "lucide-react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/memory", label: "Memory", icon: Brain },
  { href: "/app/action", label: "Action", icon: Zap },
  { href: "/app/life", label: "Life", icon: CalendarDays },
  { href: "/app/intelligence", label: "Intelligence", icon: Sparkles },
];

function useActive() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
}

export function Sidebar({ name, email, planName, isOwner, aiDemo, logout }: { name: string; email: string; planName: string; isOwner: boolean; aiDemo: boolean; logout: () => Promise<void> }) {
  const active = useActive();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-snow/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-6"><Link href="/app" aria-label="ONE home"><Logo /></Link></div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition", active(n.href, n.exact) ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:bg-white/70 hover:text-ink")}
              aria-current={active(n.href, n.exact) ? "page" : undefined}>
              <n.icon className={cn("size-[18px] transition", active(n.href, n.exact) ? "text-accent" : "text-muted group-hover:text-ink")} />
              {n.label}
            </Link>
          ))}
          <div className="my-4 border-t border-line" />
          <Link href="/app/settings" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition", active("/app/settings") ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:bg-white/70 hover:text-ink")}>
            <Settings className="size-[18px]" /> Settings
          </Link>
          {isOwner && (
            <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-muted transition hover:bg-white/70 hover:text-ink">
              <Shield className="size-[18px]" /> Admin
            </Link>
          )}
        </nav>
        {aiDemo && (
          <div className="mx-3 mb-3 rounded-xl border border-dashed border-[#e2dcff] bg-lavender/60 px-3 py-2.5 text-[12px] text-lavender-ink">
            <p className="flex items-center gap-1.5 font-semibold"><FlaskConical className="size-3.5" /> AI demo mode</p>
            <p className="mt-0.5 opacity-80">No AI model connected. Answers use keyword search & templates.</p>
          </div>
        )}
        <UserMenu name={name} email={email} planName={planName} logout={logout} />
      </aside>

      {/* Mobile top bar + bottom nav */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/app"><Logo size="sm" /></Link>
        <div className="flex items-center gap-1">
          <Link href="/app/settings" className="rounded-lg p-2 text-muted hover:bg-fog" aria-label="Settings"><Settings className="size-5" /></Link>
          {isOwner && <Link href="/admin" className="rounded-lg p-2 text-muted hover:bg-fog" aria-label="Admin"><Shield className="size-5" /></Link>}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Main mobile">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px]", active(n.href, n.exact) ? "text-accent" : "text-muted")}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function UserMenu({ name, email, planName, logout }: { name: string; email: string; planName: string; logout: () => Promise<void> }) {
  const initials = (name || email).slice(0, 1).toUpperCase();
  return (
    <DM.Root>
      <DM.Trigger className="m-3 flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 text-left shadow-soft transition hover:border-cloud focus:outline-none">
        <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-sky to-cloud text-sm font-semibold text-accent-strong">{initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{name || "Your account"}</span>
          <span className="block truncate text-[11.5px] text-muted">{planName} plan</span>
        </span>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content side="top" align="start" sideOffset={6} className="z-50 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lift">
          <div className="px-2.5 py-2 text-xs text-muted truncate">{email}</div>
          <DM.Item asChild><Link href="/app/settings" className="flex rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-fog">Settings</Link></DM.Item>
          <DM.Item asChild><Link href="/app/settings/billing" className="flex rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-fog">Plan & billing</Link></DM.Item>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item onSelect={() => { void logout(); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-fog">
            <LogOut className="size-4" /> Sign out
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
