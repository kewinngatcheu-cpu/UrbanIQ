import { createDb, setDbForTests, type Db } from "@/lib/db";

/** Fresh in-memory Postgres (PGlite + pgvector) with all migrations applied and base workspaces seeded. */
export async function freshDb(): Promise<Db> {
  delete process.env.DATABASE_URL;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.EMBEDDING_PROVIDER = "local";
  const db = await createDb({ pgliteDir: "memory://" });
  setDbForTests(db);
  const { SEED_WORKSPACES } = await import("@/lib/seed/ownerProfile");
  for (const w of SEED_WORKSPACES) {
    await db.query(`INSERT INTO workspaces (id, name, kind, description, profile, color) VALUES ($1,$2,$3,$4,$5,$6)`,
      [w.id, w.name, w.kind, w.description, JSON.stringify(w.profile), w.color]);
  }
  return db;
}
