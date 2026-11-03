"use server";
import { z } from "zod";
import { assertUser, AuthError } from "@/lib/auth";
import { systemDb, userDb } from "@/lib/db";
import { createCheckout } from "@/lib/billing";
import { findPlan } from "@/lib/plans-store";
import { createOrganization, acceptInvite, INVITE_COOKIE, logActivity } from "@/lib/org";
import { cookies } from "next/headers";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import { INTERESTS } from "./interests";
import { getT } from "@/lib/i18n/server";

export async function completeOnboarding(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "/app?welcome=1";
  const res = await run(async () => {
    const user = await assertUser();
    if (user.account_type !== "personal") throw new AuthError("This step is for ONE Personal accounts.");
    const name = z.string().trim().max(80).parse(fd(form, "name"));
    const interests = form.getAll("interests").map(String).filter((i) => INTERESTS.some((x) => x.id === i));
    const plan = fd(form, "plan");
    // Only safe profile fields — role / plan / status are never writable here.
    await systemDb().update("profiles", { id: user.id }, { full_name: name || null, onboarding_completed: true });
    const db = await userDb(user.id);
    const def = await findPlan(plan);
    const valid = def && def.world === "personal" && def.active ? def : null;
    await db.updateWhere("user_preferences", {}, { interests, requested_plan: valid?.id ?? null });
    if (interests.length) await seedStarter(user.id, interests);
    if (valid && valid.priceMonthlyEur && plan !== user.plan) {
      target = (await createCheckout(user, plan)).url; // demo page or hosted Stripe Checkout
    }
  });
  if (res.error) return res;
  // The client performs a full navigation (see flow.tsx) so the app shell starts fresh.
  return { ok: true, data: { target }, ts: Date.now() };
}

/** A few helpful starter items based on chosen interests (clearly the user's own, editable, deletable). */
async function seedStarter(userId: string, interests: string[]) {
  const db = await userDb(userId);
  const tr = await getT();
  if ((await db.count("memories")) > 0) return;
  await db.insert("memories", {
    kind: "note",
    title: tr("Welcome to ONE"),
    content: tr("This is your Memory. Save anything you want to remember — notes, ideas, documents, goals. Ask ONE about it later from your dashboard.\n\nTip: add tags like #home or #finance to connect related information."),
    summary: null, summary_source: null, tags: ["welcome"], category_id: null, document_id: null, pinned: true,
  });
  const due = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  await db.insert("tasks", {
    kind: "task", title: tr("Save your first important document in Memory"), notes: tr("For example your rental contract, an insurance policy or a recent invoice."),
    due_at: due, priority: "normal", status: "open", recurrence: "none", project_id: null, category_id: null, source_memory_id: null, completed_at: null,
  });
  const goals = INTERESTS.filter((i) => interests.includes(i.id)).slice(0, 2);
  for (const g of goals) {
    await db.insert("categories", { name: tr(g.label), color: g.color });
  }
}

/** ONE Business: create the company workspace (or join via invitation). */
export async function completeBusinessSetup(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "/business?welcome=1";
  const res = await run(async () => {
    const user = await assertUser();
    if (user.account_type !== "business") throw new AuthError("This step is for ONE Business accounts.");
    const name = z.string().trim().max(80).parse(fd(form, "name"));
    await systemDb().update("profiles", { id: user.id }, { full_name: name || null });
    const store = await cookies();
    const invite = store.get(INVITE_COOKIE)?.value;
    if (invite && fd(form, "mode") === "join") {
      await acceptInvite({ ...user, full_name: name || user.full_name }, invite);
      store.delete(INVITE_COOKIE);
      return;
    }
    const existing = await systemDb().selectOne("organization_members", { user_id: user.id, status: "active" });
    if (existing) throw new AuthError("You already belong to a company workspace.");
    const company = z.string().trim().min(2, "Please enter your company name.").max(120).parse(fd(form, "company"));
    const def = await findPlan(fd(form, "plan"));
    const org = await createOrganization(user, { name: company, industry: fd(form, "industry"), size: fd(form, "size"), plan: def?.world === "business" ? def.id : null });
    await systemDb().update("profiles", { id: user.id }, { onboarding_completed: true });
    await logActivity({ org, user }, "org", org.id, "created", `${company} was created`);
    target = "/business?welcome=1";
  });
  if (res.error) return res;
  return { ok: true, data: { target }, ts: Date.now() };
}
