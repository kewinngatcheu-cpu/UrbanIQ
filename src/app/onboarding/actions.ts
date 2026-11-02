"use server";
import { z } from "zod";
import { assertUser } from "@/lib/auth";
import { systemDb, userDb } from "@/lib/db";
import { createCheckout } from "@/lib/billing";
import { isPlanId } from "@/lib/config/plans";
import { fd, run } from "@/lib/safe-action";
import type { ActionState } from "@/lib/action-state";
import { INTERESTS } from "./interests";
import { getT } from "@/lib/i18n/server";

export async function completeOnboarding(_: ActionState, form: FormData): Promise<ActionState> {
  let target = "/app?welcome=1";
  const res = await run(async () => {
    const user = await assertUser();
    const name = z.string().trim().max(80).parse(fd(form, "name"));
    const interests = form.getAll("interests").map(String).filter((i) => INTERESTS.some((x) => x.id === i));
    const plan = fd(form, "plan");
    // Only safe profile fields — role / plan / status are never writable here.
    await systemDb().update("profiles", { id: user.id }, { full_name: name || null, onboarding_completed: true });
    const db = await userDb(user.id);
    await db.updateWhere("user_preferences", {}, { interests, requested_plan: isPlanId(plan) ? plan : null });
    if (interests.length) await seedStarter(user.id, interests);
    if (isPlanId(plan) && plan !== "free" && plan !== user.plan) {
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
