import "server-only";
import { systemDb } from "@/lib/db";

/** Append-only audit trail for security-relevant and admin actions. */
export async function audit(actorId: string | null, action: string, target?: { type: string; id: string } | null, details: Record<string, unknown> = {}) {
  try {
    await systemDb().insert("audit_logs", {
      actor_id: actorId,
      action,
      target_type: target?.type ?? null,
      target_id: target?.id ?? null,
      details,
    });
  } catch (e) {
    console.error("[audit] failed to write audit log", e);
  }
}
