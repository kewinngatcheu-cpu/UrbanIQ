import type { TableName, Tables } from "./types";

export type Where<T> = Partial<{ [K in keyof T]: T[K] | null }>;

export interface SelectOptions<T> {
  where?: Where<T>;
  /** Rows where the column is in the given list. */
  whereIn?: { column: keyof T & string; values: string[] };
  order?: { column: keyof T & string; ascending?: boolean };
  limit?: number;
}

export type NewRow<T> = Omit<T, "id" | "created_at" | "updated_at"> & Partial<Pick<T & { id: string }, "id">>;

/**
 * Minimal storage-agnostic data access interface.
 * Implemented by the local JSON store (demo / development) and Supabase (production).
 * Never use this raw interface for user data — use `scopedDb(userId)` which enforces ownership.
 */
export interface Db {
  select<K extends TableName>(table: K, opts?: SelectOptions<Tables[K]>): Promise<Tables[K][]>;
  selectOne<K extends TableName>(table: K, where: Where<Tables[K]>): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, row: NewRow<Tables[K]>): Promise<Tables[K]>;
  update<K extends TableName>(table: K, where: Where<Tables[K]>, patch: Partial<Tables[K]>): Promise<Tables[K][]>;
  remove<K extends TableName>(table: K, where: Where<Tables[K]>): Promise<number>;
  count<K extends TableName>(table: K, where?: Where<Tables[K]>): Promise<number>;
}

export function nowIso(): string {
  return new Date().toISOString();
}
