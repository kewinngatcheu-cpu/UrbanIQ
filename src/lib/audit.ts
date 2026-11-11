import "server-only";
import { getDb } from "@/lib/db";

export type AutonomyLevel = 1 | 2 | 3 | 4; // 1 Read · 2 Prepare · 3 Execute with approval · 4 Limited autonomy
export interface AuditEntry {
  actor: string;
  action: string;
  target?: string | null;
  workspaceId?: string | null;
  level?: AutonomyLevel;
  status?: "succeeded" | "failed" | "pending_approval" | "rejected";
  details?: Record<string, unknown>;
}

/** Every state-changing action is logged. Logging failures are reported, never silently swallowed. */
export async function audit(e: AuditEntry) {
  try {
    const db = await getDb();
    await db.query(
      `INSERT INTO audit_log (actor, action, target, workspace_id, level, status, details) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [e.actor, e.action, e.target ?? null, e.workspaceId ?? null, e.level ?? 1, e.status ?? "succeeded", JSON.stringify(e.details ?? {})],
    );
  } catch (err) {
    console.error("[audit] failed to write audit entry", e.action, err);
  }
}

export async function listAudit(limit = 100) {
  const db = await getDb();
  return db.query(`SELECT * FROM audit_log ORDER BY at DESC LIMIT $1`, [Math.min(limit, 500)]);
}
