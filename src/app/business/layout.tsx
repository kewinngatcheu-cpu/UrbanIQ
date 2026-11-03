import { cookies } from "next/headers";
import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { env } from "@/lib/config/env";
import { NavShell, type NavItem } from "@/components/shell/nav-shell";
import { logoutAction } from "@/app/(auth)/actions";
import { TzCookie } from "@/components/app/tz-cookie";
import { getT } from "@/lib/i18n/server";
import { isEnabled } from "@/lib/features";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { Notice } from "@/components/ui/misc";
import { Clock } from "lucide-react";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  const tr = await getT();
  const store = await cookies();
  const items: NavItem[] = [
    { href: "/business", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/business/tasks", label: "Tasks", icon: "tasks" },
    ...((await isEnabled("business_module_projects")) ? [{ href: "/business/projects", label: "Projects", icon: "projects" } as NavItem] : []),
    { href: "/business/memory", label: "Memory", icon: "memory" },
    { href: "/business/action", label: "Action", icon: "action" },
    { href: "/business/intelligence", label: "Intelligence", icon: "intelligence" },
  ];
  const secondary: NavItem[] = [
    { href: "/business/team", label: "Team", icon: "team" },
    { href: "/business/settings", label: "Settings", icon: "settings" },
  ];
  const o = ctx.org;
  const trialLeft = o.subscription_status === "trial" && o.trial_ends_at ? Math.ceil((Date.parse(o.trial_ends_at) - Date.now()) / 86400000) : null;
  return (
    <>
      <TzCookie current={store.get("one_tz")?.value ?? null} />
      <NavShell world="business" items={items} secondary={secondary} aiDemo={env.aiMode === "demo"} logout={logoutAction}
        initialCollapsed={store.get("one_nav")?.value === "collapsed"} contextLabel={o.name}
        user={{ name: ctx.user.full_name ?? "", email: ctx.user.email, sub: `${tr(ROLE_LABELS[ctx.role])} · ${ctx.ent.plan.name}` }}>
        {(await isEnabled("maintenance_mode")) && <Notice tone="peach" className="mb-6">{tr("ONE is in maintenance mode. You can read your data, but some changes may be unavailable for a short time.")}</Notice>}
        {trialLeft !== null && (
          <Notice tone={trialLeft <= 0 ? "rose" : trialLeft <= 3 ? "peach" : "blue"} className="mb-6">
            <Clock />
            <span className="flex-1">
              {trialLeft <= 0
                ? tr("The trial of {plan} has ended. Your data is safe; changes are paused until a plan is chosen.", { plan: ctx.ent.plan.name })
                : tr("Trial of {plan}: {n} days left.", { plan: ctx.ent.plan.name, n: trialLeft })}
            </span>
            {ctx.can("org.billing") && <Link href="/business/settings/billing" className="font-medium underline-offset-2 hover:underline">{tr("Choose plan")}</Link>}
          </Notice>
        )}
        {o.subscription_status === "past_due" && <Notice tone="peach" className="mb-6">{tr("The last payment failed. Please update the payment method to keep {plan}.", { plan: ctx.ent.plan.name })}</Notice>}
        {children}
      </NavShell>
    </>
  );
}
