import "server-only";
import { env } from "@/lib/config/env";
import type { Db, NewRow, SelectOptions, Where } from "./db";
import { localDb } from "./local-store";
import { supabaseDb } from "./supabase-db";
import { supabaseServiceClient, supabaseUserClient } from "@/lib/supabase/server";
import type { TableName, Tables } from "./types";

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
  select<K extends OwnedTable>(table: K, opts?: SelectOptions<Tables[K]>): Promise<Tables[K][]>;
  get<K extends OwnedTable>(table: K, id: string): Promise<Tables[K] | null>;
  insert<K extends OwnedTable>(table: K, row: Omit<NewRow<Tables[K]>, "user_id">): Promise<Tables[K]>;
  update<K extends OwnedTable>(table: K, id: string, patch: Partial<Omit<Tables[K], "id" | "user_id" | "created_at">>): Promise<Tables[K] | null>;
  updateWhere<K extends OwnedTable>(table: K, where: Where<Tables[K]>, patch: Partial<Omit<Tables[K], "id" | "user_id" | "created_at">>): Promise<Tables[K][]>;
  remove<K extends OwnedTable>(table: K, id: string): Promise<boolean>;
  removeWhere<K extends OwnedTable>(table: K, where: Where<Tables[K]>): Promise<number>;
  count<K extends OwnedTable>(table: K, where?: Where<Tables[K]>): Promise<number>;
}

export async function userDb(userId: string): Promise<UserDb> {
  if (!userId) throw new Error("userDb requires a user id");
  const db: Db = env.backend === "supabase" ? supabaseDb(await supabaseUserClient()) : localDb;
  const scope = <T>(where?: Where<T>): Where<T> => ({ ...(where ?? {}), user_id: userId }) as unknown as Where<T>;
  const strip = <T extends object>(patch: T): T => {
    const p = { ...patch } as Record<string, unknown>;
    delete p.user_id;
    delete p.id;
    delete p.created_at;
    return p as T;
  };

  return {
    userId,
    select: (table, opts = {}) => db.select(table, { ...opts, where: scope(opts.where) }),
    get: (table, id) => db.selectOne(table, scope({ id } as never)),
    insert: (table, row) => db.insert(table, { ...(strip(row as object) as object), user_id: userId } as never),
    update: async (table, id, patch) => (await db.update(table, scope({ id } as never), strip(patch as object) as never))[0] ?? null,
    updateWhere: (table, where, patch) => db.update(table, scope(where), strip(patch as object) as never),
    remove: async (table, id) => (await db.remove(table, scope({ id } as never))) > 0,
    removeWhere: (table, where) => db.remove(table, scope(where)),
    count: (table, where) => db.count(table, scope(where)),
  };
}
