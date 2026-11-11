import "server-only";
import { migrations } from "./migrations";

export type Row = Record<string, unknown>;
export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: Pick<Db, "query">) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  driver: "pglite" | "postgres";
}

/**
 * Database access. Two drivers, one SQL dialect:
 *  - DATABASE_URL set  → PostgreSQL (must have pgvector) via node-postgres
 *  - otherwise         → embedded PGlite (WASM Postgres + pgvector) persisted in PGLITE_DIR
 * Tests pass `memory://` to get a throwaway in-memory database.
 */
export async function createDb(opts: { url?: string; pgliteDir?: string } = {}): Promise<Db> {
  const url = opts.url ?? process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 10 });
    db = {
      driver: "postgres",
      async query<T>(sql: string, params: unknown[] = []) {
        return (await pool.query(sql, params)).rows as T[];
      },
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn({ query: async <T,>(s: string, p: unknown[] = []) => (await client.query(s, p)).rows as T[] });
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { vector } = await import("@electric-sql/pglite-pgvector");
    const dir = opts.pgliteDir ?? process.env.PGLITE_DIR ?? "./data/pglite";
    if (dir !== "memory://") {
      const fs = await import("node:fs");
      fs.mkdirSync(dir, { recursive: true });
    }
    const pg = await PGlite.create(dir === "memory://" ? undefined : dir, { extensions: { vector } });
    db = {
      driver: "pglite",
      async query<T>(sql: string, params: unknown[] = []) {
        return (await pg.query<T>(sql, params)).rows;
      },
      async transaction(fn) {
        return pg.transaction(async (tx) =>
          fn({ query: async <T,>(s: string, p: unknown[] = []) => (await tx.query<T>(s, p)).rows }),
        );
      },
      close: () => pg.close(),
    };
  }
  await migrate(db);
  return db;
}

export async function migrate(db: Db) {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const applied = new Set((await db.query<{ id: string }>(`SELECT id FROM schema_migrations`)).map((r) => r.id));
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    await db.transaction(async (tx) => {
      // PGlite's query() only accepts a single statement; split on statement boundaries.
      for (const stmt of splitSql(m.sql)) await tx.query(stmt);
      await tx.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [m.id]);
    });
  }
}

function splitSql(sql: string): string[] {
  return sql
    .replace(/--[^\n]*$/gm, "") // strip line comments first (they may contain ';')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Singleton per server process (survives Next.js dev hot reloads).
const g = globalThis as unknown as { __jarvisDb?: Promise<Db> };
export function getDb(): Promise<Db> {
  if (!g.__jarvisDb) {
    g.__jarvisDb = createDb().catch((e) => {
      g.__jarvisDb = undefined;
      throw e;
    });
  }
  return g.__jarvisDb;
}

/** Test hook: inject a database instance. */
export function setDbForTests(db: Db) {
  g.__jarvisDb = Promise.resolve(db);
}
