"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError } from "@/lib/auth";
import { assertAdmin as assertOwner } from "@/lib/admin-guard";
import { systemDb } from "@/lib/db";
import { activatePlan, activateOrgPlan } from "@/lib/billing";
import { audit } from "@/lib/audit";
import { FEATURE_FLAGS, setFlag, type FlagKey } from "@/lib/features";
import { LIMIT_KEYS, BUSINESS_FEATURES, PERSONAL_FEATURES, isWorld, type FeatureKey } from "@/lib/config/plans";
import { findPlan, savePlanConfig } from "@/lib/plans-store";
import { createOrganization } from "@/lib/org";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";

/** Every admin action: server-side owner check first, audit log always. */

export async function setUserStatus(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = fd(form, "id");
    const status = fd(form, "status") === "suspended" ? "suspended" : "active";
    if (id === owner.id) throw new AuthError("You can't change your own status.");
    const reason = z.string().trim().min(3, "Please give a short reason (it's logged).").max(500).parse(fd(form, "reason"));
    const updated = await systemDb().update("profiles", { id }, { status });
    if (!updated.length) throw new AuthError("User not found.");
    await audit(owner.id, status === "suspended" ? "admin.user_suspended" : "admin.user_unsuspended", { type: "user", id }, { reason });
    revalidatePath("/admin", "layout");
    return { ok: true, message: status === "suspended" ? "User suspended." : "User reactivated.", ts: Date.now() };
  });
}

export async function setUserPlan(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = fd(form, "id");
    const def = await findPlan(fd(form, "plan"));
    if (!def || def.world !== "personal") throw new AuthError("Unknown plan.");
    const plan = def.id;
    const reason = z.string().trim().min(3, "Please give a short reason (it's logged).").max(500).parse(fd(form, "reason"));
    if (!(await systemDb().selectOne("profiles", { id }))) throw new AuthError("User not found.");
    await activatePlan(id, plan, def.priceMonthlyEur === 0 ? "none" : "admin_grant", null, owner.id);
    await audit(owner.id, "admin.plan_granted", { type: "user", id }, { plan, reason });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Membership updated.", ts: Date.now() };
  });
}

export async function toggleFlag(form: FormData) {
  const owner = await assertOwner();
  const key = fd(form, "key") as FlagKey;
  if (!(key in FEATURE_FLAGS)) return;
  const enabled = fd(form, "enabled") === "true";
  await setFlag(key, enabled);
  await audit(owner.id, "admin.feature_flag_changed", { type: "flag", id: key }, { enabled });
  revalidatePath("/admin", "layout");
}

export async function setFeedbackStatus(form: FormData) {
  const owner = await assertOwner();
  const status = (["new", "reviewed", "resolved"] as const).find((s) => s === fd(form, "status"));
  if (!status) return;
  await systemDb().update("feedback", { id: fd(form, "id") }, { status });
  await audit(owner.id, "admin.feedback_status", { type: "feedback", id: fd(form, "id") }, { status });
  revalidatePath("/admin/feedback");
}

const reasonOf = (form: FormData) => z.string().trim().min(3, "Please give a short reason (it's logged).").max(500).parse(fd(form, "reason"));

// ───────────────────────── Plans ─────────────────────────

const num = (v: string, field: string) => {
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw new AuthError(`Please enter a valid number for “${field}”.`);
  return n;
};

/** Edit price, availability, limits, features and bullets of any plan (default or custom). */
export async function savePlan(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const plan = await findPlan(fd(form, "id"));
    if (!plan) throw new AuthError("Unknown plan.");
    const priceRaw = fd(form, "price").trim();
    const price = priceRaw === "" ? null : Math.round(num(priceRaw, "price") * 100) / 100;
    if (price !== null && price > 100_000) throw new AuthError("That price looks wrong.");
    const limits: Record<string, number> = {};
    for (const k of LIMIT_KEYS) limits[k] = Math.floor(num(fd(form, `limit_${k}`) || String(plan.limits[k]), k));
    const keys = plan.world === "business" ? BUSINESS_FEATURES : PERSONAL_FEATURES;
    const features = Object.fromEntries(keys.map((k) => [k, form.get(`feature_${k}`) === "on"])) as Record<FeatureKey, boolean>;
    const config = {
      name: z.string().trim().min(2).max(60).parse(fd(form, "name")),
      tagline: fd(form, "tagline").slice(0, 160),
      priceMonthlyEur: price,
      active: form.get("active") === "on",
      highlight: form.get("highlight") === "on",
      sort: Math.floor(num(fd(form, "sort") || String(plan.sort), "sort")),
      bullets: fd(form, "bullets").split("\n").map((b) => b.trim()).filter(Boolean).slice(0, 12),
      limits, features,
    };
    await savePlanConfig(plan.id, config);
    await audit(owner.id, "admin.plan_config_changed", { type: "plan", id: plan.id }, { price, previousPrice: plan.priceMonthlyEur, active: config.active, world: plan.world });
    revalidatePath("/", "layout");
    return { ok: true, message: "Plan saved.", ts: Date.now() };
  });
}

/** Create a new (inactive) plan for one world. Ids are lowercase and immutable. */
export async function createPlan(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,30}$/, "Use 3–31 lowercase letters, digits or _ for the id.").parse(fd(form, "id"));
    const world = fd(form, "world");
    if (!isWorld(world)) throw new AuthError("Please choose Personal or Business.");
    if (await findPlan(id)) throw new AuthError("A plan with this id already exists.");
    const name = z.string().trim().min(2, "Please enter a name.").max(60).parse(fd(form, "name"));
    await savePlanConfig(id, { world, name, active: false, priceMonthlyEur: null, sort: 50 });
    await audit(owner.id, "admin.plan_created", { type: "plan", id }, { world });
    revalidatePath("/admin/plans");
    return { ok: true, message: "Plan created (inactive). Configure it below.", data: { id }, ts: Date.now() };
  });
}

// ───────────────────────── Businesses ─────────────────────────

export async function setOrgStatus(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = fd(form, "id");
    const status = fd(form, "status") === "suspended" ? "suspended" : "active";
    const reason = reasonOf(form);
    const updated = await systemDb().update("organizations", { id }, { status });
    if (!updated.length) throw new AuthError("Company not found.");
    await audit(owner.id, status === "suspended" ? "admin.org_suspended" : "admin.org_reactivated", { type: "org", id }, { reason });
    revalidatePath("/admin", "layout");
    return { ok: true, message: status === "suspended" ? "Company suspended." : "Company reactivated.", ts: Date.now() };
  });
}

export async function setOrgPlan(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const id = fd(form, "id");
    const def = await findPlan(fd(form, "plan"));
    if (!def || def.world !== "business") throw new AuthError("Unknown plan.");
    const reason = reasonOf(form);
    if (!(await systemDb().selectOne("organizations", { id }))) throw new AuthError("Company not found.");
    const mode = fd(form, "mode");
    await activateOrgPlan(id, def.id, mode === "trial" ? "none" : "admin_grant", null, owner.id, mode === "trial" ? { status: "trial" } : {});
    await audit(owner.id, "admin.org_plan_granted", { type: "org", id }, { plan: def.id, reason, mode });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Company plan updated.", ts: Date.now() };
  });
}

// ───────────────────────── Account type requests ─────────────────────────

export async function decideAccountTypeRequest(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const db = systemDb();
    const req = await db.selectOne("account_type_requests", { id: fd(form, "id"), status: "pending" });
    if (!req) throw new AuthError("Request not found.");
    const approve = fd(form, "decision") === "approve";
    const now = new Date().toISOString();
    if (approve) {
      const user = await db.selectOne("profiles", { id: req.user_id });
      if (!user) throw new AuthError("User not found.");
      if (user.id === owner.id) throw new AuthError("The owner account can't switch its type here.");
      // Data is never moved between worlds: personal data stays personal, company data stays with the company.
      await db.update("profiles", { id: user.id }, { account_type: req.to_type, active_org_id: null });
      if (req.to_type === "business") {
        const existing = await db.selectOne("organization_members", { user_id: user.id, status: "active" });
        if (!existing) await createOrganization({ ...user, account_type: "business" }, { name: req.company_name || "My company", industry: "", size: "", plan: null });
      } else {
        // Leaving business: memberships end (company content stays with the company).
        await db.update("organization_members", { user_id: user.id, status: "active" } as never, { status: "removed" });
      }
    }
    await db.update("account_type_requests", { id: req.id }, { status: approve ? "approved" : "rejected", decided_by: owner.id, decided_at: now });
    await audit(owner.id, approve ? "admin.account_type_approved" : "admin.account_type_rejected", { type: "user", id: req.user_id }, { from: req.from_type, to: req.to_type });
    revalidatePath("/admin", "layout");
    return { ok: true, message: approve ? "Switch approved." : "Request rejected.", ts: Date.now() };
  });
}

// ───────────────────────── Platform settings ─────────────────────────

async function setSetting(key: string, patch: Record<string, unknown>) {
  const db = systemDb();
  const row = await db.selectOne("platform_settings", { key });
  const value = { ...(row?.value ?? {}), ...patch };
  if (row) await db.update("platform_settings", { key }, { value });
  else await db.insert("platform_settings", { key, value });
}

export async function savePlatformSettings(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const owner = await assertOwner();
    const trialDays = Math.floor(num(fd(form, "trialDays") || "14", "trial days"));
    if (trialDays < 0 || trialDays > 90) throw new AuthError("Trial days must be between 0 and 90.");
    await setSetting("business", { trialDays });
    await setSetting("branding", { tagline: fd(form, "tagline").slice(0, 120), supportEmail: fd(form, "supportEmail").slice(0, 120) });
    await audit(owner.id, "admin.platform_settings_changed", { type: "settings", id: "platform" }, { trialDays });
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved.", ts: Date.now() };
  });
}
