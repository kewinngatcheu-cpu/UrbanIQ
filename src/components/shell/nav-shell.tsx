"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DM from "@radix-ui/react-dropdown-menu";
import {
  Brain, Briefcase, CalendarDays, CheckSquare, ChevronsLeft, ChevronsRight, FolderKanban, Home, LayoutGrid, LogOut, Settings, Shield, Sparkles,
  Users, Zap, FlaskConical, MoreHorizontal, X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitch } from "@/components/language-switch";
import { useT } from "@/components/i18n";
import { cn } from "@/lib/utils";

/** Icons are referenced by key (functions can't be passed from Server to Client Components). */
const ICONS = { home: Home, memory: Brain, action: Zap, life: CalendarDays, intelligence: Sparkles, settings: Settings, admin: Shield, projects: FolderKanban, tasks: CheckSquare, team: Users, dashboard: LayoutGrid, briefcase: Briefcase };
export type IconKey = keyof typeof ICONS;

export interface NavItem { href: string; label: string; icon: IconKey; exact?: boolean }

export function NavShell({
  world, items, secondary, user, aiDemo, logout, children, contextLabel, initialCollapsed = false,
}: {
  /** From the `one_nav` cookie, so server and client render the same layout. */
  initialCollapsed?: boolean;
  world: "personal" | "business";
  items: NavItem[];
  secondary: NavItem[];
  user: { name: string; email: string; sub: string };
  aiDemo: boolean;
  logout: () => Promise<void>;
  children: React.ReactNode;
  /** e.g. the company name in ONE Business */
  contextLabel?: string;
}) {
  const tr = useT();
  const path = usePathname();
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [more, setMore] = React.useState(false);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `one_nav=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };
  const active = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  const mobileMain = items.slice(0, 4);
  const mobileMore = [...items.slice(4), ...secondary];
  const badge = world === "business" ? "BUSINESS" : "PERSONAL";

  const link = (i: NavItem, rail: boolean) => {
    const I = ICONS[i.icon];
    const on = active(i);
    return (
      <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} title={rail ? tr(i.label) : undefined}
        className={cn("group flex items-center gap-3 rounded-xl text-[14px] transition", rail ? "justify-center p-2.5" : "px-3 py-2.5",
          on ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:bg-white/70 hover:text-ink")}>
        <I className={cn("size-[18px] shrink-0", on ? "text-accent" : "text-muted group-hover:text-ink")} />
        {!rail && <span className="truncate">{tr(i.label)}</span>}
        {rail && <span className="sr-only">{tr(i.label)}</span>}
      </Link>
    );
  };

  const userMenu = (rail: boolean) => (
    <DM.Root>
      <DM.Trigger className={cn("m-3 flex items-center gap-3 rounded-xl border border-line bg-white text-left shadow-soft transition hover:border-cloud focus:outline-none", rail ? "justify-center p-1.5" : "p-2.5")} aria-label={tr("Your account")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky to-cloud text-sm font-semibold text-accent-strong">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
        {!rail && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{user.name || tr("Your account")}</span>
            <span className="block truncate text-[11.5px] text-muted">{user.sub}</span>
          </span>
        )}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content side="top" align="start" sideOffset={6} className="z-50 w-60 rounded-xl border border-line bg-white p-1.5 shadow-lift">
          <div className="truncate px-2.5 py-2 text-xs text-muted">{user.email}</div>
          {secondary.map((s) => (
            <DM.Item key={s.href} asChild><Link href={s.href} className="flex rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-fog">{tr(s.label)}</Link></DM.Item>
          ))}
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item onSelect={() => { void logout(); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-fog">
            <LogOut className="size-4" /> {tr("Sign out")}
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );

  const sidebar = (rail: boolean, className: string) => (
    <aside className={cn("fixed inset-y-0 left-0 z-30 flex-col border-r border-line bg-snow/80 backdrop-blur-xl", rail ? "w-[76px]" : "w-64", className)}>
      <div className={cn("flex h-16 items-center", rail ? "justify-center" : "justify-between px-5")}>
        <Link href={items[0].href} aria-label="ONE">{rail ? <Logo size="sm" className="[&>span:last-child]:hidden" /> : <Logo />}</Link>
        {!rail && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em]", world === "business" ? "bg-ink text-white" : "bg-mist text-accent-strong")}>{badge}</span>}
      </div>
      {contextLabel && !rail && <p className="mx-5 -mt-1 mb-1 truncate text-[12px] text-muted" title={contextLabel}>{contextLabel}</p>}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-3", rail ? "px-2.5" : "px-3")} aria-label={tr("Main")}>
        {items.map((i) => link(i, rail))}
        <div className="my-3 border-t border-line" />
        {secondary.map((i) => link(i, rail))}
      </nav>
      {!rail && <div className="mx-3 mb-2"><LanguageSwitch /></div>}
      {aiDemo && !rail && (
        <div className="mx-3 mb-2 rounded-xl border border-dashed border-[#e2dcff] bg-lavender/60 px-3 py-2 text-[12px] text-lavender-ink">
          <p className="flex items-center gap-1.5 font-semibold"><FlaskConical className="size-3.5" /> {tr("AI demo mode")}</p>
        </div>
      )}
      {userMenu(rail)}
    </aside>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop: full sidebar (collapsible) */}
      {sidebar(collapsed, "hidden lg:flex")}
      <button onClick={toggle} aria-label={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
        className={cn("fixed top-5 z-40 hidden size-7 items-center justify-center rounded-full border border-line bg-white text-muted shadow-soft transition hover:text-ink lg:flex", collapsed ? "left-[62px]" : "left-[242px]")}>
        {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
      </button>
      {/* Tablet: icon rail */}
      {sidebar(true, "hidden md:flex lg:hidden")}

      {/* Phone: top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/85 px-4 backdrop-blur-xl md:hidden">
        <Link href={items[0].href} className="flex items-center gap-2"><Logo size="sm" /><span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em]", world === "business" ? "bg-ink text-white" : "bg-mist text-accent-strong")}>{badge}</span></Link>
        <LanguageSwitch />
      </div>

      <div className={cn("transition-[padding] md:pl-[76px]", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 lg:px-8 lg:pt-10">{children}</main>
      </div>

      {/* Phone: bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label={tr("Main mobile")}>
        {mobileMain.map((i) => {
          const I = ICONS[i.icon];
          return (
            <Link key={i.href} href={i.href} aria-current={active(i) ? "page" : undefined} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10.5px]", active(i) ? "text-accent" : "text-muted")}>
              <I className="size-5" /> <span className="max-w-full truncate px-0.5">{tr(i.label)}</span>
            </Link>
          );
        })}
        <button onClick={() => setMore(true)} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10.5px] text-muted" aria-haspopup="dialog">
          <MoreHorizontal className="size-5" /> {tr("More")}
        </button>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={tr("More")}>
          <button className="absolute inset-0 bg-ink/20" aria-label={tr("Close")} onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lift">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-ink">{user.name || user.email}</p>
              <button onClick={() => setMore(false)} className="rounded-full p-2 text-muted hover:bg-fog" aria-label={tr("Close")}><X className="size-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mobileMore.map((i) => {
                const I = ICONS[i.icon];
                return (
                  <Link key={i.href} href={i.href} onClick={() => setMore(false)} className={cn("flex min-h-12 items-center gap-2.5 rounded-2xl border px-3.5 text-[14px]", active(i) ? "border-cloud bg-mist text-ink" : "border-line text-ink")}>
                    <I className="size-[18px] text-accent" /> {tr(i.label)}
                  </Link>
                );
              })}
              <button onClick={() => void logout()} className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-line px-3.5 text-left text-[14px] text-ink">
                <LogOut className="size-[18px] text-muted" /> {tr("Sign out")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
