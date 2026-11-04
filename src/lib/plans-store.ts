import "server-only";
import { cache } from "react";
import { systemDb } from "@/lib/db";
import { DEFAULT_PLANS, LIMIT_KEYS, isWorld, type Plan, type World, type FeatureKey } from "@/lib/config/plans";

/**
 * The effective plan catalogue = code defaults + owner overrides from `plan_configs`.
 * Overrides are partial; custom plans (created in /admin/plans) are stored complete.
 */
function merge(base: Plan, o: Record<string, unknown>): Plan {
  const p: Plan = structuredClone(base);
  if (typeof o.name === "string" && o.name.trim()) p.name = o.name.trim();
  if (typeof o.tagline === "string") p.tagline = o.tagline;
  if (o.priceMonthlyEur === null || (typeof o.priceMonthlyEur === "number" && o.priceMonthlyEur >= 0)) p.priceMonthlyEur = o.priceMonthlyEur as number | null;
  if (typeof o.active === "boolean") p.active = o.active;
  if (typeof o.highlight === "boolean") p.highlight = o.highlight;
  if (typeof o.sort === "number") p.sort = o.sort;
  if (o.aiEffort === "low" || o.aiEffort === "medium" || o.aiEffort === "high") p.aiEffort = o.aiEffort;
  if (Array.isArray(o.bullets)) p.bullets = (o.bullets as unknown[]).map(String).filter(Boolean).slice(0, 12);
  if (o.limits && typeof o.limits === "object") {
    for (const k of LIMIT_KEYS) {
      const v = (o.limits as Record<string, unknown>)[k];
      if (typeof v === "number" && v >= 0 && Number.isFinite(v)) p.limits[k] = Math.floor(v);
    }
  }
  if (o.features && typeof o.features === "object") {
    for (const [k, v] of Object.entries(o.features as Record<string, unknown>)) if (typeof v === "boolean") p.features[k as FeatureKey] = v;
  }
  return p;
}

export const getCatalog = cache(async (): Promise<Plan[]> => {
  const rows = await systemDb().select("plan_configs");
  const byId = new Map(rows.map((r) => [r.id, r.config]));
  const out: Plan[] = DEFAULT_PLANS.map((d) => (byId.has(d.id) ? merge(d, byId.get(d.id)!) : structuredClone(d)));
  for (const r of rows) {
    if (DEFAULT_PLANS.some((d) => d.id === r.id)) continue;
    const c = r.config;
    if (!isWorld(c.world)) continue;
    const base: Plan = {
      id: r.id, world: c.world, name: String(c.name ?? r.id), tagline: "", priceMonthlyEur: null, active: false, sort: 99, custom: true,
      limits: structuredClone(DEFAULT_PLANS.find((d) => d.world === c.world)!.limits), features: {}, bullets: [], aiEffort: "medium",
    };
    out.push(merge(base, c));
  }
  return out.sort((a, b) => (a.world === b.world ? a.sort - b.sort : a.world === "personal" ? -1 : 1));
});

export async function plansFor(world: World, opts: { includeInactive?: boolean } = {}) {
  return (await getCatalog()).filter((p) => p.world === world && (opts.includeInactive || p.active));
}

export async function findPlan(id: string): Promise<Plan | null> {
  return (await getCatalog()).find((p) => p.id === id) ?? null;
}

/** Owner only (call behind assertOwner): store a partial override / custom plan definition. */
export async function savePlanConfig(id: string, config: Record<string, unknown>) {
  const db = systemDb();
  const existing = await db.selectOne("plan_configs", { id });
  if (existing) await db.update("plan_configs", { id }, { config: { ...existing.config, ...config } });
  else await db.insert("plan_configs", { id, config });
}
