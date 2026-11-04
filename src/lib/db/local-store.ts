import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/config/env";
import type { Db, NewRow, SelectOptions, Where } from "./db";
import { nowIso } from "./db";
import type { TableName, Tables } from "./types";

/**
 * Local JSON-file database used when Supabase is not configured.
 * Intended for local development, demos and tests — NOT for multi-instance production.
 * Writes are serialized through an in-process queue and persisted atomically.
 */
type Data = { [K in TableName]?: Tables[K][] };

interface StoreState {
  data: Data | null;
  loading: Promise<Data> | null;
  writeChain: Promise<void>;
}

const g = globalThis as unknown as { __oneLocalStore?: StoreState };
const state: StoreState = (g.__oneLocalStore ??= { data: null, loading: null, writeChain: Promise.resolve() });

function filePath() {
  return path.resolve(process.cwd(), env.dataDir, "one-db.json");
}

async function load(): Promise<Data> {
  if (state.data) return state.data;
  if (!state.loading) {
    state.loading = (async () => {
      try {
        const raw = await fs.readFile(filePath(), "utf8");
        state.data = JSON.parse(raw) as Data;
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        state.data = {};
      }
      return state.data!;
    })();
  }
  return state.loading;
}

function persist(): Promise<void> {
  state.writeChain = state.writeChain.then(async () => {
    const file = filePath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state.data), "utf8");
    await fs.rename(tmp, file);
  });
  return state.writeChain;
}

function matches<T>(row: T, where?: Where<T>): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    const rv = (row as unknown as Record<string, unknown>)[k];
    if (v === null ? rv !== null && rv !== undefined : rv !== v) return false;
  }
  return true;
}

function table<K extends TableName>(data: Data, name: K): Tables[K][] {
  return ((data[name] as Tables[K][] | undefined) ??= [] as Tables[K][]) as Tables[K][];
}

const clone = <T>(v: T): T => structuredClone(v);

export const localDb: Db = {
  async select<K extends TableName>(name: K, opts: SelectOptions<Tables[K]> = {}) {
    const data = await load();
    let rows = table(data, name).filter((r) => matches(r, opts.where));
    if (opts.whereIn) {
      const set = new Set(opts.whereIn.values);
      const col = opts.whereIn.column;
      rows = rows.filter((r) => set.has(String((r as unknown as Record<string, unknown>)[col])));
    }
    if (opts.order) {
      const { column, ascending = true } = opts.order;
      rows = [...rows].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[column] as string | number | null;
        const bv = (b as unknown as Record<string, unknown>)[column] as string | number | null;
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
      });
    }
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return clone(rows);
  },

  async selectOne(name, where) {
    const data = await load();
    const row = table(data, name).find((r) => matches(r, where));
    return row ? clone(row) : null;
  },

  async insert<K extends TableName>(name: K, row: NewRow<Tables[K]>) {
    const data = await load();
    const ts = nowIso();
    const full = { id: randomUUID(), created_at: ts, updated_at: ts, ...clone(row) } as unknown as Tables[K];
    table(data, name).push(full);
    await persist();
    return clone(full);
  },

  async update(name, where, patch) {
    const data = await load();
    const updated: Tables[typeof name][] = [];
    const ts = nowIso();
    for (const r of table(data, name)) {
      if (matches(r, where)) {
        Object.assign(r, clone(patch), { updated_at: ts });
        updated.push(clone(r));
      }
    }
    if (updated.length) await persist();
    return updated;
  },

  async remove(name, where) {
    const data = await load();
    const rows = table(data, name);
    const keep = rows.filter((r) => !matches(r, where));
    const removed = rows.length - keep.length;
    if (removed) {
      (data as Record<string, unknown>)[name] = keep;
      await persist();
    }
    return removed;
  },

  async count(name, where) {
    const data = await load();
    return table(data, name).filter((r) => matches(r, where)).length;
  },
};
