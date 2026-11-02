import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Db, SelectOptions, Where } from "./db";
import { nowIso } from "./db";
import type { TableName, Tables } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyWhere(q: any, where?: Record<string, unknown>) {
  if (!where) return q;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    q = v === null ? q.is(k, null) : q.eq(k, v);
  }
  return q;
}

function fail(table: string, op: string, error: { message: string } | null): never {
  throw new Error(`[db] ${op} on ${table} failed: ${error?.message ?? "unknown error"}`);
}

/**
 * Supabase / PostgreSQL implementation.
 * When constructed with a user-session client, Row Level Security applies to every query.
 * When constructed with the service-role client, RLS is bypassed — only use for system/admin code paths.
 */
export function supabaseDb(client: SupabaseClient): Db {
  return {
    async select<K extends TableName>(table: K, opts: SelectOptions<Tables[K]> = {}) {
      let q: any = client.from(table).select("*");
      q = applyWhere(q, opts.where as Record<string, unknown>);
      if (opts.whereIn) q = q.in(opts.whereIn.column, opts.whereIn.values);
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true, nullsFirst: false });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) fail(table, "select", error);
      return (data ?? []) as Tables[K][];
    },
    async selectOne<K extends TableName>(table: K, where: Where<Tables[K]>) {
      const q: any = applyWhere(client.from(table).select("*"), where as Record<string, unknown>);
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) fail(table, "selectOne", error);
      return (data ?? null) as Tables[K] | null;
    },
    async insert(table, row) {
      const ts = nowIso();
      const { data, error } = await client
        .from(table)
        .insert({ created_at: ts, updated_at: ts, ...(row as object) })
        .select("*")
        .single();
      if (error) fail(table, "insert", error);
      return data as any;
    },
    async update(table, where, patch) {
      const q: any = applyWhere(client.from(table).update({ ...(patch as object), updated_at: nowIso() }), where as Record<string, unknown>);
      const { data, error } = await q.select("*");
      if (error) fail(table, "update", error);
      return (data ?? []) as any;
    },
    async remove(table, where) {
      const q: any = applyWhere(client.from(table).delete({ count: "exact" }), where as Record<string, unknown>);
      const { count, error } = await q;
      if (error) fail(table, "delete", error);
      return count ?? 0;
    },
    async count(table, where) {
      const q: any = applyWhere(client.from(table).select("id", { count: "exact", head: true }), where as Record<string, unknown>);
      const { count, error } = await q;
      if (error) fail(table, "count", error);
      return count ?? 0;
    },
  };
}
