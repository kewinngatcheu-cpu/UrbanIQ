import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser, isOwner } from "@/lib/auth";
import { env } from "@/lib/config/env";
import { personalEnt } from "@/lib/permissions/entitlements";
import { NavShell, type NavItem } from "@/components/shell/nav-shell";
import { logoutAction } from "@/app/(auth)/actions";
import { TzCookie } from "@/components/app/tz-cookie";
import { getT } from "@/lib/i18n/server";
import { isEnabled } from "@/lib/features";
import { Notice } from "@/components/ui/misc";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Strict separation of product worlds: business accounts never see ONE Personal.
  if (user.account_type === "business") redirect("/business");
  if (!user.onboarding_completed) redirect("/onboarding");
  const tr = await getT();
  const store = await cookies();
  const plan = (await personalEnt(user)).plan;
  const items: NavItem[] = [
    { href: "/app", label: "Home", icon: "home", exact: true },
    { href: "/app/memory", label: "Memory", icon: "memory" },
    { href: "/app/action", label: "Action", icon: "action" },
    { href: "/app/life", label: "Life", icon: "life" },
    { href: "/app/intelligence", label: "Intelligence", icon: "intelligence" },
  ];
  const secondary: NavItem[] = [{ href: "/app/settings", label: "Settings", icon: "settings" }];
  if (isOwner(user)) secondary.push({ href: "/admin", label: "Admin", icon: "admin" });
  const maintenance = !isOwner(user) && (await isEnabled("maintenance_mode"));
  return (
    <>
      <TzCookie current={store.get("one_tz")?.value ?? null} />
      <NavShell world="personal" items={items} secondary={secondary} aiDemo={env.aiMode === "demo"} logout={logoutAction}
        initialCollapsed={store.get("one_nav")?.value === "collapsed"}
        user={{ name: user.full_name ?? "", email: user.email, sub: tr("{plan} plan", { plan: plan.name }) }}>
        {maintenance && <Notice tone="peach" className="mb-6">{tr("ONE is in maintenance mode. You can read your data, but some changes may be unavailable for a short time.")}</Notice>}
        {children}
      </NavShell>
    </>
  );
}
