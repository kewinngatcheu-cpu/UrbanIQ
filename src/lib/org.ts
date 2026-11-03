import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { systemDb, orgDb, type UserDb } from "@/lib/db";
import type { OrgMember, OrgRole, Organization, Profile } from "@/lib/db/types";
import { AuthError, getCurrentUser, requireUser, assertNotMaintenance } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions/roles";
import { entitlementsFor, orgSubject, type Entitlements } from "@/lib/permissions/entitlements";
import { findPlan } from "@/lib/plans-store";
import { DEFAULT_PLAN } from "@/lib/config/plans";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/auth/password";

export interface OrgContext {
  user: Profile;
  org: Organization;
  member: OrgMember;
  role: OrgRole;
  ent: Entitlements;
  db: UserDb;
  can: (p: Permission) => boolean;
}

export const TRIAL_DAYS_DEFAULT = 14;
/** Pending invitation of a person who is signing up through an invite link. */
export const INVITE_COOKIE = "one_invite";

/** Loads the business workspace of the signed-in user. Membership & role always come from the DB. */
async function loadContext(user: Profile): Promise<OrgContext | null> {
  if (user.account_type !== "business") return null;
  const sys = systemDb();
  const memberships = (await sys.select("organization_members", { where: { user_id: user.id, status: "active" } }));
  if (!memberships.length) return null;
  const member = memberships.find((m) => m.org_id === user.active_org_id) ?? memberships[0];
  const org = await sys.selectOne("organizations", { id: member.org_id });
  if (!org) return null;
  const ent = await entitlementsFor(orgSubject(org));
  const db = await orgDb(org.id, user.id);
  return { user, org, member, role: member.role, ent, db, can: (p) => can(member.role, p) };
}

/** For pages: redirects personal users to their own world; 404 if the workspace is suspended. */
export const requireOrg = cache(async (): Promise<OrgContext> => {
  const user = await requireUser();
  if (user.account_type !== "business") redirect("/app");
  const ctx = await loadContext(user);
  if (!ctx) redirect("/onboarding"); // business account without a company → setup / join
  if (ctx.org.status === "suspended") redirect("/auth/signout?reason=suspended");
  return ctx;
});

/** For pages that need a permission: renders 404 for members without it (no information leak). */
export async function requireOrgPage(p: Permission): Promise<OrgContext> {
  const ctx = await requireOrg();
  if (!ctx.can(p)) notFound();
  return ctx;
}

/** For server actions: throws instead of redirecting. */
export async function assertOrg(p?: Permission): Promise<OrgContext> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in again.");
  if (user.status !== "active") throw new AuthError("This account is suspended.");
  if (!user.email_verified) throw new AuthError("Please verify your email address first.");
  await assertNotMaintenance(user);
  const ctx = await loadContext(user);
  if (!ctx) throw new AuthError("No company workspace found.");
  if (ctx.org.status === "suspended") throw new AuthError("This company workspace is suspended.");
  if (p && !ctx.can(p)) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
  return ctx;
}

export async function logActivity(ctx: Pick<OrgContext, "org" | "user">, entity: "project" | "task" | "memory" | "action" | "member" | "client" | "org", entityId: string | null, verb: string, summary: string, projectId: string | null = null) {
  try {
    await systemDb().insert("org_activity", { org_id: ctx.org.id, actor_id: ctx.user.id, entity, entity_id: entityId, verb, summary: summary.slice(0, 300), project_id: projectId });
  } catch (e) {
    console.error("[org] activity log failed", e);
  }
}

export async function trialDays(): Promise<number> {
  const row = await systemDb().selectOne("platform_settings", { key: "business" });
  const v = Number(row?.value?.trialDays);
  return Number.isInteger(v) && v >= 0 && v <= 90 ? v : TRIAL_DAYS_DEFAULT;
}

/** Creates a company workspace with the user as Business Owner. Server-side only. */
export async function createOrganization(user: Profile, input: { name: string; industry?: string | null; size?: string | null; plan?: string | null }) {
  const sys = systemDb();
  const plan = input.plan ? await findPlan(input.plan) : null;
  const planId = plan && plan.world === "business" && plan.active ? plan.id : DEFAULT_PLAN.business;
  const days = await trialDays();
  const org = await sys.insert("organizations", {
    name: input.name.trim().slice(0, 120) || "My company",
    owner_id: user.id,
    industry: input.industry?.trim().slice(0, 80) || null,
    size: input.size?.trim().slice(0, 40) || null,
    plan: planId,
    subscription_status: "trial",
    provider: "none",
    provider_ref: null,
    stripe_customer_id: null,
    price_monthly_eur: 0,
    trial_ends_at: new Date(Date.now() + days * 86400000).toISOString(),
    current_period_end: null,
    canceled_at: null,
    status: "active",
  });
  await sys.insert("organization_members", { org_id: org.id, user_id: user.id, role: "owner", status: "active", invited_by: null });
  await sys.update("profiles", { id: user.id }, { active_org_id: org.id });
  await audit(user.id, "business.org_created", { type: "org", id: org.id }, { plan: planId });
  return org;
}

// ───────────────────────── Invitations ─────────────────────────

export async function createInvite(ctx: OrgContext, email: string, role: Exclude<OrgRole, "owner">) {
  const sys = systemDb();
  const token = randomToken();
  await sys.update("organization_invites", { org_id: ctx.org.id, email, accepted_at: null, revoked_at: null } as never, { revoked_at: new Date().toISOString() });
  const invite = await sys.insert("organization_invites", {
    org_id: ctx.org.id, email, role, token_hash: sha256(token), invited_by: ctx.user.id,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), accepted_at: null, revoked_at: null,
  });
  return { invite, token };
}

export async function findInvite(token: string) {
  const inv = await systemDb().selectOne("organization_invites", { token_hash: sha256(token) });
  if (!inv || inv.accepted_at || inv.revoked_at || Date.parse(inv.expires_at) < Date.now()) return null;
  const org = await systemDb().selectOne("organizations", { id: inv.org_id });
  if (!org || org.status !== "active") return null;
  return { invite: inv, org };
}

/** Accepts an invitation for the signed-in user. The invite email must match the account email. */
export async function acceptInvite(user: Profile, token: string) {
  const found = await findInvite(token);
  if (!found) throw new AuthError("This invitation is invalid or has expired.");
  const { invite, org } = found;
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) throw new AuthError("This invitation was sent to a different email address.");
  if (user.account_type !== "business") throw new AuthError("Invitations can only be accepted with a ONE Business account.");
  const sys = systemDb();
  const existing = await sys.selectOne("organization_members", { org_id: org.id, user_id: user.id });
  if (existing && existing.status === "active") throw new AuthError("You're already a member of this company.");
  const ent = await entitlementsFor(orgSubject(org));
  const seats = await sys.count("organization_members", { org_id: org.id, status: "active" });
  const { assertMemberCapacity } = await import("@/lib/permissions/entitlements");
  await assertMemberCapacity(ent, seats);
  if (existing) await sys.update("organization_members", { id: existing.id }, { status: "active", role: invite.role, invited_by: invite.invited_by });
  else await sys.insert("organization_members", { org_id: org.id, user_id: user.id, role: invite.role, status: "active", invited_by: invite.invited_by });
  await sys.update("organization_invites", { id: invite.id }, { accepted_at: new Date().toISOString() });
  await sys.update("profiles", { id: user.id }, { active_org_id: org.id, onboarding_completed: true });
  await logActivity({ org, user }, "member", user.id, "joined", `${user.full_name || user.email} joined as ${invite.role}`);
  await audit(user.id, "business.invite_accepted", { type: "org", id: org.id }, { role: invite.role });
  return org;
}
