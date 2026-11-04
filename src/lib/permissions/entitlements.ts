import "server-only";
import { systemDb } from "@/lib/db";
import type { FeatureKey, Plan, PlanId, World, PlanLimits } from "@/lib/config/plans";
import { DEFAULT_PLAN, FEATURE_LABELS } from "@/lib/config/plans";
import { getCatalog } from "@/lib/plans-store";
import type { Organization, Profile } from "@/lib/db/types";

/**
 * Server-side entitlements for both product worlds.
 * Personal limits are counted per user; business limits per organization.
 */
export class LimitError extends Error {
  constructor(message: string, public readonly upgradeTo: PlanId | null) {
    super(message);
  }
}

export type Subject =
  | { world: "personal"; userId: string; planId: PlanId }
  | { world: "business"; orgId: string; planId: PlanId; status: Organization["subscription_status"]; trialEndsAt: string | null };

export function personalSubject(p: Pick<Profile, "id" | "plan">): Subject {
  return { world: "personal", userId: p.id, planId: p.plan };
}
export function orgSubject(o: Pick<Organization, "id" | "plan" | "subscription_status" | "trial_ends_at">): Subject {
  return { world: "business", orgId: o.id, planId: o.plan, status: o.subscription_status, trialEndsAt: o.trial_ends_at };
}

export interface Entitlements {
  subject: Subject;
  plan: Plan;
  limits: PlanLimits;
  has: (f: FeatureKey) => boolean;
}

export async function entitlementsFor(subject: Subject): Promise<Entitlements> {
  const catalog = await getCatalog();
  const plan = catalog.find((p) => p.id === subject.planId && p.world === subject.world)
    ?? catalog.find((p) => p.id === DEFAULT_PLAN[subject.world])!;
  return { subject, plan, limits: plan.limits, has: (f) => !!plan.features[f] };
}

/** Convenience for personal code paths. */
export function personalEnt(p: Pick<Profile, "id" | "plan">) {
  return entitlementsFor(personalSubject(p));
}

async function upgradeTarget(world: World, current: Plan, test: (p: Plan) => boolean): Promise<PlanId | null> {
  const next = (await getCatalog()).filter((p) => p.world === world && p.active && p.sort > current.sort && test(p)).sort((a, b) => a.sort - b.sort)[0];
  return next?.id ?? null;
}

export async function requireFeature(ent: Entitlements, feature: FeatureKey) {
  if (ent.has(feature)) return;
  const to = await upgradeTarget(ent.subject.world, ent.plan, (p) => !!p.features[feature]);
  const catalog = await getCatalog();
  const name = catalog.find((p) => p.id === to)?.name;
  throw new LimitError(name ? `This feature is part of ONE ${name}.` : `“${FEATURE_LABELS[feature]}” is not included in your plan.`, to);
}

export function currentPeriod(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function usageWhere(s: Subject) {
  return s.world === "personal" ? { user_id: s.userId, org_id: null } : { org_id: s.orgId };
}

export async function getUsage(s: Subject) {
  const row = await systemDb().selectOne("usage_limits", { ...usageWhere(s), period: currentPeriod() } as never);
  return { aiRequests: row?.ai_requests ?? 0 };
}

/** Business trial / payment state: writes are blocked once a trial ended without a plan. */
export async function assertWritable(ent: Entitlements) {
  const s = ent.subject;
  if (s.world !== "business") return;
  if (s.status === "canceled" || (s.status === "trial" && s.trialEndsAt && Date.parse(s.trialEndsAt) < Date.now())) {
    throw new LimitError("Your company's trial has ended. Choose a plan to keep working — your data is safe.", ent.plan.id);
  }
}

/** Reserve one AI request against the monthly limit. */
export async function consumeAiRequest(ent: Entitlements, actorId: string) {
  await assertWritable(ent);
  const db = systemDb();
  const period = currentPeriod();
  const limit = ent.limits.aiRequestsPerMonth;
  const where = { ...usageWhere(ent.subject), period };
  const row = await db.selectOne("usage_limits", where as never);
  const used = row?.ai_requests ?? 0;
  if (used >= limit) {
    throw new LimitError(`You've used all ${limit} AI requests for this month.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.aiRequestsPerMonth > limit));
  }
  if (row) await db.update("usage_limits", { id: row.id }, { ai_requests: used + 1 });
  else await db.insert("usage_limits", { user_id: ent.subject.world === "personal" ? ent.subject.userId : actorId, org_id: ent.subject.world === "business" ? ent.subject.orgId : null, period, ai_requests: 1 });
}

export async function storageUsedBytes(s: Subject): Promise<number> {
  const docs = await systemDb().select("documents", { where: s.world === "personal" ? { user_id: s.userId, org_id: null } : { org_id: s.orgId } } as never);
  return docs.reduce((sum, d) => sum + (d.size_bytes || 0), 0);
}

export async function assertCanStore(ent: Entitlements, addBytes: number) {
  await assertWritable(ent);
  const l = ent.limits;
  if (addBytes > l.maxFileMb * 1024 * 1024) {
    throw new LimitError(`Files on ${ent.plan.name} can be up to ${l.maxFileMb} MB.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.maxFileMb > l.maxFileMb));
  }
  if ((await storageUsedBytes(ent.subject)) + addBytes > l.storageMb * 1024 * 1024) {
    throw new LimitError(`Your ${l.storageMb} MB storage is full.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.storageMb > l.storageMb));
  }
}

async function countIn(table: "memories" | "action_items" | "projects", s: Subject, filter: (r: Record<string, unknown>) => boolean = () => true) {
  const rows = await systemDb().select(table, { where: s.world === "personal" ? { user_id: s.userId, org_id: null } : { org_id: s.orgId } } as never);
  return (rows as unknown as Record<string, unknown>[]).filter(filter).length;
}

export async function assertMemoryCapacity(ent: Entitlements) {
  await assertWritable(ent);
  const limit = ent.limits.memories;
  if ((await countIn("memories", ent.subject)) >= limit) {
    throw new LimitError(`You've reached ${limit} saved memories.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.memories > limit));
  }
}

export async function assertActionCapacity(ent: Entitlements) {
  await assertWritable(ent);
  const limit = ent.limits.activeActions;
  if ((await countIn("action_items", ent.subject, (r) => r.status !== "done")) >= limit) {
    throw new LimitError(`${ent.plan.name} includes ${limit} open actions at a time.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.activeActions > limit));
  }
}

export async function assertProjectCapacity(ent: Entitlements) {
  await assertWritable(ent);
  const limit = ent.limits.projects;
  if ((await countIn("projects", ent.subject, (r) => r.status !== "archived")) >= limit) {
    throw new LimitError(`${ent.plan.name} includes ${limit} active projects.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.projects > limit));
  }
}

export async function assertMemberCapacity(ent: Entitlements, currentSeats: number) {
  await assertWritable(ent);
  const limit = ent.limits.members;
  if (currentSeats >= limit) {
    throw new LimitError(`${ent.plan.name} includes up to ${limit} users.`, await upgradeTarget(ent.subject.world, ent.plan, (p) => p.limits.members > limit));
  }
}
