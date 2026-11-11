import "server-only";
import { getDb } from "@/lib/db";
import { createMemory } from "@/lib/memory/service";
import { SEED_MEMORIES, SEED_WORKSPACES } from "./ownerProfile";

/** Idempotent: creates base workspaces always, seed memories only when the memory table is empty. */
export async function seedInitialData() {
  const db = await getDb();
  for (const w of SEED_WORKSPACES) {
    await db.query(
      `INSERT INTO workspaces (id, name, kind, description, profile, color) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [w.id, w.name, w.kind, w.description, JSON.stringify(w.profile), w.color],
    );
  }
  const [{ n }] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM memories`);
  if (n === 0) {
    for (const m of SEED_MEMORIES) await createMemory(m, "system", { allowDuplicate: true });
  }
}
