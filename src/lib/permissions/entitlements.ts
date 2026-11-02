import "server-only";
import { PLANS, minPlanFor, type FeatureKey, type PlanId } from "@/lib/config/plans";
import { systemDb } from "@/lib/db";
import type { Profile } from "@/lib/db/types";

export class LimitError extends Error {
  constructor(message: string, public readonly upgradeTo: PlanId | null) {
    super(message);
  }
}

export function planOf(profile: Pick<Profile, "plan">) {
  return PLANS[profile.plan] ?? PLANS.free;
}

export function hasFeature(profile: Pick<Profile, "plan">, feature: FeatureKey): boolean {
  return planOf(profile).features[feature];
}

export function requireFeature(profile: Pick<Profile, "plan">, feature: FeatureKey) {
  if (!hasFeature(profile, feature)) {
    const to = minPlanFor(feature);
    throw new LimitError(`This feature is part of ONE ${PLANS[to].name}.`, to);
  }
}

export function currentPeriod(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextPlan(plan: PlanId): PlanId | null {
  return plan === "free" ? "premium" : plan === "premium" ? "exclusive" : null;
}

export async function getUsage(userId: string) {
  const row = await systemDb().selectOne("usage_limits", { user_id: userId, period: currentPeriod() });
  return { aiRequests: row?.ai_requests ?? 0 };
}

/** Reserve one AI request against the monthly limit. Throws LimitError when exhausted. */
export async function consumeAiRequest(profile: Profile) {
  const db = systemDb();
  const period = currentPeriod();
  const limit = planOf(profile).limits.aiRequestsPerMonth;
  const row = await db.selectOne("usage_limits", { user_id: profile.id, period });
  const used = row?.ai_requests ?? 0;
  if (used >= limit) {
    throw new LimitError(`You've used all ${limit} AI requests for this month.`, nextPlan(profile.plan));
  }
  if (row) await db.update("usage_limits", { id: row.id }, { ai_requests: used + 1 });
  else await db.insert("usage_limits", { user_id: profile.id, period, ai_requests: 1 });
}

export async function storageUsedBytes(userId: string): Promise<number> {
  const docs = await systemDb().select("documents", { where: { user_id: userId } });
  return docs.reduce((s, d) => s + (d.size_bytes || 0), 0);
}

export async function assertCanStore(profile: Profile, addBytes: number) {
  const limits = planOf(profile).limits;
  if (addBytes > limits.maxFileMb * 1024 * 1024) {
    throw new LimitError(`Files on ${planOf(profile).name} can be up to ${limits.maxFileMb} MB.`, nextPlan(profile.plan));
  }
  const used = await storageUsedBytes(profile.id);
  if (used + addBytes > limits.storageMb * 1024 * 1024) {
    throw new LimitError(`Your ${limits.storageMb} MB storage is full.`, nextPlan(profile.plan));
  }
}

export async function assertMemoryCapacity(profile: Profile) {
  const limit = planOf(profile).limits.memories;
  const n = await systemDb().count("memories", { user_id: profile.id });
  if (n >= limit) throw new LimitError(`You've reached ${limit} saved memories.`, nextPlan(profile.plan));
}

export async function assertActionCapacity(profile: Profile) {
  const limit = planOf(profile).limits.activeActions;
  const rows = await systemDb().select("action_items", { where: { user_id: profile.id } });
  if (rows.filter((r) => r.status !== "done").length >= limit) {
    throw new LimitError(`${planOf(profile).name} includes ${limit} open actions at a time.`, nextPlan(profile.plan));
  }
}
