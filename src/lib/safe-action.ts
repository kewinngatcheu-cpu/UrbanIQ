import "server-only";
import { z } from "zod";
import type { ActionState } from "./action-state";
import { AuthError } from "@/lib/auth";
import { LimitError } from "@/lib/permissions/entitlements";
import { AiError } from "@/lib/ai/provider";
import { BillingError } from "@/lib/billing";

/** Normalises thrown errors into user-facing ActionState (never leaks internals). */
export function toActionError(e: unknown): ActionState {
  const ts = Date.now();
  // Next.js redirect()/notFound() must propagate.
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
  if (e instanceof LimitError) return { error: e.message, upgradeTo: e.upgradeTo, ts };
  if (e instanceof AuthError || e instanceof AiError || e instanceof BillingError) return { error: e.message, ts };
  if (e && typeof e === "object" && "type" in e && String((e as { type: unknown }).type).startsWith("Stripe")) {
    console.error("[action] stripe error", e);
    return { error: "The payment provider couldn't process this right now. Nothing was charged — please try again.", ts };
  }
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Please check your input.", ts };
  console.error("[action] unexpected error", e);
  return { error: "Something went wrong. Please try again.", ts };
}

export async function run(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true, ts: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}

export function fd(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}
