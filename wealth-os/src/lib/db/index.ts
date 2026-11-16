/**
 * Persistenz: IndexedDB via Dexie (local-first, offline, Daten verlassen das Gerät nicht).
 * Alle Zugriffe laufen über dieses Repository → ein späterer Sync-Adapter (z. B. Supabase)
 * kann hier andocken, ohne UI oder Berechnungen zu ändern.
 */
import Dexie, { type Table } from "dexie";
import type {
  Account,
  AiReport,
  BalanceSnapshot,
  Budget,
  Debt,
  FinanceData,
  Goal,
  Holding,
  MonthClosing,
  PropertyPlan,
  RecurringItem,
  Settings,
  Transaction,
} from "../types";
import { baselineData, demoData } from "../seed";
import { backupSchema } from "./schema";

export class WealthDB extends Dexie {
  settings!: Table<Settings, string>;
  transactions!: Table<Transaction, string>;
  recurring!: Table<RecurringItem, string>;
  budgets!: Table<Budget, string>;
  accounts!: Table<Account, string>;
  holdings!: Table<Holding, string>;
  snapshots!: Table<BalanceSnapshot, string>;
  debts!: Table<Debt, string>;
  goals!: Table<Goal, string>;
  property!: Table<PropertyPlan, string>;
  closings!: Table<MonthClosing, string>;
  aiReports!: Table<AiReport, string>;

  constructor(name = "wealth-os") {
    super(name);
    this.version(1).stores({
      settings: "id",
      transactions: "id, date, category, type, recurringId",
      recurring: "id, kind, category",
      budgets: "id, category",
      accounts: "id, bucket, type",
      holdings: "id, accountId",
      snapshots: "id, accountId, month",
      debts: "id",
      goals: "id, type",
      property: "id",
      closings: "id",
      aiReports: "id, month",
    });
  }
}

let _db: WealthDB | null = null;
export function db(): WealthDB {
  if (!_db) _db = new WealthDB();
  return _db;
}

const TABLES = ["transactions", "recurring", "budgets", "accounts", "holdings", "snapshots", "debts", "goals", "closings", "aiReports"] as const;

export async function loadAll(d: WealthDB = db()): Promise<FinanceData | null> {
  const settings = await d.settings.get("main");
  const property = await d.property.get("main");
  if (!settings || !property) return null;
  const [transactions, recurring, budgets, accounts, holdings, snapshots, debts, goals, closings, aiReports] = await Promise.all(
    TABLES.map((t) => d.table(t).toArray()),
  );
  return {
    settings,
    property,
    transactions: (transactions as Transaction[]).sort((a, b) => b.date.localeCompare(a.date)),
    recurring: recurring as RecurringItem[],
    budgets: budgets as Budget[],
    accounts: accounts as Account[],
    holdings: holdings as Holding[],
    snapshots: snapshots as BalanceSnapshot[],
    debts: debts as Debt[],
    goals: goals as Goal[],
    closings: closings as MonthClosing[],
    aiReports: (aiReports as AiReport[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/** Ersetzt den kompletten Datenbestand atomar. */
export async function replaceAll(data: FinanceData, d: WealthDB = db()): Promise<void> {
  await d.transaction("rw", d.tables, async () => {
    await Promise.all(d.tables.map((t) => t.clear()));
    await d.settings.put(data.settings);
    await d.property.put(data.property);
    for (const t of TABLES) await d.table(t).bulkPut(data[t] as unknown[]);
  });
}

export async function ensureSeeded(d: WealthDB = db()): Promise<void> {
  const s = await d.settings.get("main");
  if (!s) await replaceAll(demoData(), d);
}

export async function resetToDemo() {
  await replaceAll(demoData());
}
export async function resetToBaseline() {
  await replaceAll(baselineData());
}

export async function exportBackup(): Promise<string> {
  const data = await loadAll();
  return JSON.stringify({ app: "wealth-os", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export async function importBackup(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Datei ist kein gültiges JSON." };
  }
  const res = backupSchema.safeParse(parsed);
  if (!res.success) return { ok: false, error: `Ungültiges Backup: ${res.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  await replaceAll(res.data.data as FinanceData);
  return { ok: true };
}

/* ───────── generische CRUD-Helfer ───────── */
type TableName = (typeof TABLES)[number];
export async function upsert<T extends { id: string }>(table: TableName, row: T) {
  await db().table(table).put(row);
}
export async function remove(table: TableName, id: string) {
  await db().table(table).delete(id);
}
export async function updateSettings(patch: Partial<Settings>) {
  const cur = await db().settings.get("main");
  if (cur) await db().settings.put({ ...cur, ...patch });
}
export async function updateProperty(patch: Partial<PropertyPlan>) {
  const cur = await db().property.get("main");
  if (cur) await db().property.put({ ...cur, ...patch });
}
