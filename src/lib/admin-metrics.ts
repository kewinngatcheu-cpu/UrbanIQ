import "server-only";
import { systemDb } from "@/lib/db";
import { getCatalog } from "@/lib/plans-store";
import type { Plan } from "@/lib/config/plans";

const DAY = 86400000;

/**
 * Aggregated platform numbers for the owner. Only metadata and counts — never content.
 * Revenue is computed ONLY from real (Stripe) subscriptions; demo/admin grants are excluded.
 */
export async function platformMetrics(now = Date.now()) {
  const db = systemDb();
  const [profiles, subs, orgs, members, auditRows, catalog] = await Promise.all([
    db.select("profiles"),
    db.select("subscriptions"),
    db.select("organizations"),
    db.select("organization_members", { where: { status: "active" } }),
    db.select("audit_logs", { order: { column: "created_at", ascending: false }, limit: 5000 }),
    getCatalog(),
  ]);
  const priceOf = (id: string | null | undefined) => catalog.find((p) => p.id === id)?.priceMonthlyEur ?? 0;
  const personal = profiles.filter((p) => p.account_type !== "business");
  const business = profiles.filter((p) => p.account_type === "business");
  const within = (iso: string | null | undefined, days: number) => !!iso && now - Date.parse(iso) < days * DAY;

  const personalByPlan = Object.fromEntries(catalog.filter((p) => p.world === "personal").map((p) => [p.id, personal.filter((u) => u.plan === p.id).length]));
  const orgByPlan = Object.fromEntries(catalog.filter((p) => p.world === "business").map((p) => [p.id, orgs.filter((o) => o.plan === p.id).length]));

  const personalPaid = subs.filter((s) => s.status === "active" && priceOf(s.plan) !== 0 && s.provider !== "none");
  const orgPaid = orgs.filter((o) => o.subscription_status === "active" && o.provider !== "none");
  const realPersonal = personalPaid.filter((s) => s.provider === "stripe");
  const realOrgs = orgPaid.filter((o) => o.provider === "stripe");
  const mrrPersonal = realPersonal.reduce((s, x) => s + (x.price_monthly_eur || 0), 0);
  const mrrBusiness = realOrgs.reduce((s, x) => s + (x.price_monthly_eur || 0), 0);

  const changes = auditRows.filter((a) => a.action === "subscription.plan_changed" && within(a.created_at, 30));
  let upgrades = 0, downgrades = 0;
  for (const c of changes) {
    const m = (c.details ?? {}) as { plan?: string; previous?: string | null };
    const a = priceOf(m.previous), b = priceOf(m.plan);
    if (b > (a ?? 0)) upgrades++;
    else if (b < (a ?? 0)) downgrades++;
  }
  const cancellations30 = auditRows.filter((a) => a.action === "subscription.canceled" && within(a.created_at, 30)).length;

  return {
    now, profiles, personal, business, orgs, members, subs, catalog, auditRows,
    counts: {
      users: profiles.length, personal: personal.length, business: business.length, orgs: orgs.length,
      orgsTrial: orgs.filter((o) => o.subscription_status === "trial").length,
      orgsSuspended: orgs.filter((o) => o.status === "suspended").length,
      new7: profiles.filter((p) => within(p.created_at, 7)).length,
      new30: profiles.filter((p) => within(p.created_at, 30)).length,
      active30: profiles.filter((p) => within(p.last_active_at, 30)).length,
      personalPaid: personalPaid.length, orgPaid: orgPaid.length,
      upgrades, downgrades, cancellations30,
    },
    personalByPlan, orgByPlan,
    revenue: { real: realPersonal.length + realOrgs.length > 0, mrrPersonal, mrrBusiness, mrr: mrrPersonal + mrrBusiness, payingAccounts: realPersonal.length + realOrgs.length },
    priceOf,
  };
}

export function registrationsByDay(rows: { created_at: string }[], days: number, now = Date.now()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    return { d, n: rows.filter((p) => p.created_at.slice(0, 10) === d).length };
  });
}

export const planName = (catalog: Plan[], id: string) => catalog.find((p) => p.id === id)?.name ?? id;
