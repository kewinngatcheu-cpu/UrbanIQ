import "server-only";
import { systemDb, userDb } from "@/lib/db";
import { PRIVATE_TABLES } from "@/lib/db/types";
import { deleteFiles } from "@/lib/storage";
import { env } from "@/lib/config/env";

/** Everything stored for a user (GDPR Art. 15/20 export). Credentials are never exported. */
export async function exportAccountData(userId: string) {
  const db = await userDb(userId);
  const sys = systemDb();
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    format: "ONE export v1",
    profile: await sys.selectOne("profiles", { id: userId }),
    subscription: await sys.selectOne("subscriptions", { user_id: userId }),
    preferences: await db.select("user_preferences"),
    usage: await db.select("usage_limits"),
    support_access_grants: await db.select("support_access_grants"),
  };
  for (const t of PRIVATE_TABLES) out[t] = await db.select(t);
  return out;
}

/** Permanently deletes a user's data and files (GDPR Art. 17). */
export async function deleteAccountData(userId: string) {
  const db = await userDb(userId);
  const docs = await db.select("documents");
  await deleteFiles(docs.map((d) => d.storage_path));
  for (const t of [...PRIVATE_TABLES].reverse()) await db.removeWhere(t, {});
  const sys = systemDb();
  for (const t of ["user_preferences", "usage_limits", "support_access_grants", "billing_checkouts", "subscriptions"] as const) {
    await sys.remove(t, { user_id: userId });
  }
  await sys.update("feedback", { user_id: userId }, { user_id: null, email: null });
  await sys.remove("profiles", { id: userId });
  if (env.backend === "local") await sys.remove("local_credentials", { id: userId });
}
