import "server-only";
import { env } from "@/lib/config/env";
import type { Db, NewRow, SelectOptions, Where } from "./db";
import { localDb } from "./local-store";
import { supabaseDb } from "./supabase-db";
import { supabaseServiceClient, supabaseUserClient } from "@/lib/supabase/server";
import type { TableName, Tables } from "./types";
import { DUAL_TABLES } from "./types";

export type { Db } from "./db";

/**
 * System database access (bypasses per-user scoping).
 * ONLY for: auth bootstrap, subscription changes after server-side confirmation,
 * usage counters, audit logging and owner-admin operations behind `requireOwner()`.
 */
export function systemDb(): Db {
  return env.backend === "supabase" ? supabaseDb(supabaseServiceClient()) : localDb;
}

type OwnedTable = {
  [K in TableName]: Tables[K] extends { user_id: string } ? K : never;
}[TableName];

/**
 * Per-user data access. Every read, write and delete is constrained to `user_id = userId`.
 * In Supabase mode it additionally runs through the user's session client, so
 * Row Level Security enforces the same rule in the database (defense in depth).
 */
export interface UserDb {
  userId: string;
  /** null = personal scope; set = business workspace scope. */
  orgId: string | null;
  select<K extends OwnedTable>(table: K, opts?: SelectOptions<Tables[K]>): Promise<Tables[K][]>;
  get<K extends OwnedTable>(table: K, id: string): Promise<Tables[K] | null>;
  insert<K extends OwnedTable>(table: K, row: Omit<NewRow<Tables[K]>, "user_id">): Promise<Tables[K]>;
  update<K extends OwnedTable>(table: K, id: string, patch: Partial<Omit<Tables[K], "id" | "user_id" | "created_at">>): Promise<Tables[K] | null>;
  updateWhere<K extends OwnedTable>(table: K, where: Where<Tables[K]>, patch: Partial<Omit<Tables[K], "id" | "user_id" | "created_at">>): Promise<Tables[K][]>;
  remove<K extends OwnedTable>(table: K, id: string): Promise<boolean>;
  removeWhere<K extends OwnedTable>(table: K, where: Where<Tables[K]>): Promise<number>;
  count<K extends OwnedTable>(table: K, where?: Where<Tables[K]>): Promise<number>;
}

const DUAL = new Set<string>(DUAL_TABLES);

function strip<T extends object>(patch: T): T {
  const p = { ...patch } as Record<string, unknown>;
  delete p.user_id;
  delete p.org_id;
  delete p.id;
  delete p.created_at;
  return p as T;
}

function scoped(db: Db, userId: string, orgId: string | null, scopeFor: (table: string) => Record<string, unknown>, insertDefaults: (table: string) => Record<string, unknown>): UserDb {
  const scope = <T>(table: string, where?: Where<T>): Where<T> => ({ ...(where ?? {}), ...scopeFor(table) }) as unknown as Where<T>;
  return {
    userId,
    orgId,
    select: (table, opts = {}) => db.select(table, { ...opts, where: scope(table, opts.where) }),
    get: (table, id) => db.selectOne(table, scope(table, { id } as never)),
    insert: (table, row) => db.insert(table, { ...(strip(row as object) as object), ...insertDefaults(table) } as never),
    update: async (table, id, patch) => (await db.update(table, scope(table, { id } as never), strip(patch as object) as never))[0] ?? null,
    updateWhere: (table, where, patch) => db.update(table, scope(table, where), strip(patch as object) as never),
    remove: async (table, id) => (await db.remove(table, scope(table, { id } as never))) > 0,
    removeWhere: (table, where) => db.remove(table, scope(table, where)),
    count: (table, where) => db.count(table, scope(table, where)),
  };
}

/**
 * Personal data access. Every query is pinned to `user_id = userId` and — for tables shared with
 * ONE Business — to `org_id IS NULL`, so business data never shows up in the personal world.
 * In Supabase mode it runs through the user's session client (RLS enforces the same rules).
 */
export async function userDb(userId: string): Promise<UserDb> {
  if (!userId) throw new Error("userDb requires a user id");
  const db: Db = env.backend === "supabase" ? supabaseDb(await supabaseUserClient()) : localDb;
  return scoped(db, userId, null,
    (t) => (DUAL.has(t) ? { user_id: userId, org_id: null } : { user_id: userId }),
    (t) => (DUAL.has(t) ? { user_id: userId, org_id: null } : { user_id: userId }));
}

const ORG_TABLES = new Set<string>([...DUAL_TABLES, "clients"]);

/**
 * Business data access for one organization. Pinned to `org_id = orgId`; new rows record the acting
 * member as `user_id`. Callers MUST have verified membership + permission first (lib/org.ts).
 * In Supabase mode RLS additionally requires an active membership in that organization.
 */
export async function orgDb(orgId: string, actorId: string): Promise<UserDb> {
  if (!orgId || !actorId) throw new Error("orgDb requires an organization and an actor");
  const db: Db = env.backend === "supabase" ? supabaseDb(await supabaseUserClient()) : localDb;
  const guard = (t: string) => {
    if (!ORG_TABLES.has(t)) throw new Error(`Table ${t} is not available in a business workspace`);
  };
  return scoped(db, actorId, orgId,
    (t) => (guard(t), { org_id: orgId }),
    (t) => (guard(t), { org_id: orgId, user_id: actorId }));
}
