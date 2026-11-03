"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthError } from "@/lib/auth";
import { systemDb } from "@/lib/db";
import { assertOrg, createInvite, logActivity } from "@/lib/org";
import { assignableRoles, canManageMember } from "@/lib/permissions/roles";
import { assertMemberCapacity } from "@/lib/permissions/entitlements";
import { createCheckout, cancelOrgSubscription } from "@/lib/billing";
import { findPlan } from "@/lib/plans-store";
import { rateLimit } from "@/lib/auth/rate-limit";
import { sendMail } from "@/lib/mail";
import { env } from "@/lib/config/env";
import { audit } from "@/lib/audit";
import { getT } from "@/lib/i18n/server";
import { emailSchema } from "@/lib/validation";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import type { OrgRole } from "@/lib/db/types";

export async function inviteMember(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("members.invite");
    if (!rateLimit(`invite:${ctx.org.id}`, 20, 60 * 60 * 1000)) throw new AuthError("Too many invitations. Please try again later.");
    const email = emailSchema.parse(fd(form, "email"));
    const role = fd(form, "role") as Exclude<OrgRole, "owner">;
    if (!assignableRoles(ctx.role).includes(role)) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
    const sys = systemDb();
    const seats = await sys.count("organization_members", { org_id: ctx.org.id, status: "active" });
    const open = (await sys.select("organization_invites", { where: { org_id: ctx.org.id } })).filter((i) => !i.accepted_at && !i.revoked_at && Date.parse(i.expires_at) > Date.now() && i.email !== email).length;
    await assertMemberCapacity(ctx.ent, seats + open);
    const existingProfile = await sys.selectOne("profiles", { email });
    if (existingProfile && (await sys.selectOne("organization_members", { org_id: ctx.org.id, user_id: existingProfile.id, status: "active" }))) {
      throw new AuthError("This person is already a member.");
    }
    const { token } = await createInvite(ctx, email, role);
    const url = `${env.appUrl}/invite/${token}`;
    const tr = await getT();
    const { delivered } = await sendMail({
      to: email,
      subject: tr("You're invited to {company} on ONE", { company: ctx.org.name }),
      heading: tr("Join {company} on ONE Business", { company: ctx.org.name }),
      body: tr("{name} invited you to work together in ONE Business. The invitation is valid for 7 days.", { name: ctx.user.full_name || ctx.user.email }),
      cta: { label: tr("Accept invitation"), url },
    });
    await logActivity(ctx, "member", null, "invited", `${email} was invited as ${role}`);
    await audit(ctx.user.id, "business.member_invited", { type: "org", id: ctx.org.id }, { role });
    revalidatePath("/business/team");
    // Without a mail service the inviter gets the link to pass on personally.
    return { ok: true, message: delivered ? "Invitation sent." : "Invitation created. Send this link to the person:", data: delivered ? {} : { link: url }, ts: Date.now() };
  });
}

export async function revokeInvite(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("members.invite");
    await systemDb().update("organization_invites", { id: fd(form, "id"), org_id: ctx.org.id }, { revoked_at: new Date().toISOString() });
    revalidatePath("/business/team");
  });
}

export async function changeMemberRole(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("members.manage");
    const sys = systemDb();
    const m = await sys.selectOne("organization_members", { id: fd(form, "id"), org_id: ctx.org.id, status: "active" });
    if (!m) throw new AuthError("Member not found.");
    if (m.user_id === ctx.user.id) throw new AuthError("You can't change your own role.");
    const role = fd(form, "role") as Exclude<OrgRole, "owner">;
    if (!canManageMember(ctx.role, m.role) || !assignableRoles(ctx.role).includes(role)) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
    await sys.update("organization_members", { id: m.id }, { role });
    await logActivity(ctx, "member", m.user_id, "role", `A member's role changed from ${m.role} to ${role}`);
    await audit(ctx.user.id, "business.member_role_changed", { type: "org", id: ctx.org.id }, { member: m.user_id, from: m.role, to: role });
    revalidatePath("/business/team");
    return { ok: true, message: "Role updated.", ts: Date.now() };
  });
}

export async function removeMember(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("members.manage");
    const sys = systemDb();
    const m = await sys.selectOne("organization_members", { id: fd(form, "id"), org_id: ctx.org.id, status: "active" });
    if (!m) throw new AuthError("Member not found.");
    if (m.user_id === ctx.user.id) throw new AuthError("You can't remove yourself.");
    if (!canManageMember(ctx.role, m.role)) throw new AuthError("Your role doesn't allow this. Ask a Business Owner or Admin.");
    await sys.update("organization_members", { id: m.id }, { status: "removed" });
    // Open tasks of the removed person go back to the person removing them.
    await ctx.db.updateWhere("tasks", { assignee_id: m.user_id, status: "open" }, { assignee_id: ctx.user.id });
    await logActivity(ctx, "member", m.user_id, "removed", "A member was removed from the company");
    await audit(ctx.user.id, "business.member_removed", { type: "org", id: ctx.org.id }, { member: m.user_id });
    revalidatePath("/business/team");
  });
}

export async function updateCompany(_: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("org.manage");
    const name = z.string().trim().min(2, "Please enter your company name.").max(120).parse(fd(form, "name"));
    await systemDb().update("organizations", { id: ctx.org.id }, { name, industry: fd(form, "industry").slice(0, 80) || null, size: fd(form, "size").slice(0, 40) || null });
    await logActivity(ctx, "org", ctx.org.id, "updated", "Company profile was updated");
    revalidatePath("/business", "layout");
    return { ok: true, message: "Company profile saved.", ts: Date.now() };
  });
}

export async function startBusinessCheckout(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "";
  const res = await run(async () => {
    const ctx = await assertOrg("org.billing");
    const def = await findPlan(fd(form, "plan"));
    if (!def || def.world !== "business") throw new AuthError("Please choose a business plan.");
    target = (await createCheckout(ctx.user, def.id, ctx.org.id)).url;
  });
  if (res.error) return res;
  redirect(target);
}

export async function cancelBusinessPlan(): Promise<ActionState> {
  return run(async () => {
    const ctx = await assertOrg("org.billing");
    const when = await cancelOrgSubscription(ctx.org.id, ctx.user.id);
    revalidatePath("/business", "layout");
    return { ok: true, message: when === "period_end" ? "Your plan will end at the close of the current billing period." : "The company plan was cancelled.", ts: Date.now() };
  });
}
