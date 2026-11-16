/**
 * Speicherung lokal im Browser (IndexedDB via Dexie): dauerhaft, offline, ohne Konto.
 * Alle Zugriffe laufen über dieses Modul – ein späterer Cloud-Sync (z. B. Supabase) dockt hier an.
 */
import Dexie, { type Table } from "dexie";
import { z } from "zod";
import type { Account, Debt, Expense, FinanceData, Goal, Movement, PlanItem, Settings, Snapshot } from "./types";
import { CATEGORIES } from "./types";
import { initialData } from "./seed";
import { dueAutoBookings, goalBalance, makeSnapshot } from "./calc/finance";
import { round2, uid } from "./format";

export class KewinDB extends Dexie {
  settings!: Table<Settings, string>;
  plan!: Table<PlanItem, string>;
  expenses!: Table<Expense, string>;
  goals!: Table<Goal, string>;
  movements!: Table<Movement, string>;
  accounts!: Table<Account, string>;
  debts!: Table<Debt, string>;
  snapshots!: Table<Snapshot, string>;
  constructor(name = "kewin-finance") {
    super(name);
    this.version(1).stores({
      settings: "id",
      plan: "id, kind",
      expenses: "id, date, category",
      goals: "id, order",
      movements: "id, date, goalId, kind",
      accounts: "id",
      debts: "id",
      snapshots: "month",
    });
  }
}

let instance: KewinDB | null = null;
export const db = () => (instance ??= new KewinDB());

const LIST_TABLES = ["plan", "expenses", "goals", "movements", "accounts", "debts", "snapshots"] as const;

export async function loadAll(d: KewinDB = db()): Promise<FinanceData | null> {
  const settings = await d.settings.get("main");
  if (!settings) return null;
  const [plan, expenses, goals, movements, accounts, debts, snapshots] = await Promise.all(LIST_TABLES.map((t) => d.table(t).toArray()));
  return {
    settings,
    plan: plan as PlanItem[],
    expenses: (expenses as Expense[]).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    goals: (goals as Goal[]).sort((a, b) => a.order - b.order),
    movements: (movements as Movement[]).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    accounts: accounts as Account[],
    debts: debts as Debt[],
    snapshots: (snapshots as Snapshot[]).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function replaceAll(data: FinanceData, d: KewinDB = db()) {
  await d.transaction("rw", d.tables, async () => {
    await Promise.all(d.tables.map((t) => t.clear()));
    await d.settings.put(data.settings);
    for (const t of LIST_TABLES) await d.table(t).bulkPut(data[t] as unknown[]);
  });
}

export async function ensureInitialized(d: KewinDB = db()) {
  if (!(await d.settings.get("main"))) await replaceAll(initialData(), d);
}

/** Fällige Sparpläne buchen + Vermögens-Snapshot des Monats aktualisieren (läuft bei jedem App-Start). */
export async function runMaintenance(now = new Date(), d: KewinDB = db()) {
  const data = await loadAll(d);
  if (!data) return;
  const due = dueAutoBookings(data, now);
  if (due.length) await d.movements.bulkPut(due);
  const fresh = due.length ? (await loadAll(d))! : data;
  await d.snapshots.put(makeSnapshot(fresh, now));
}

export async function refreshSnapshot(now = new Date()) {
  const data = await loadAll();
  if (data) await db().snapshots.put(makeSnapshot(data, now));
}

/* ───────── Aktionen ───────── */

export async function saveExpense(e: Expense) {
  if (!(e.amount > 0)) throw new Error("Betrag muss größer als 0 sein.");
  await db().expenses.put({ ...e, amount: round2(e.amount) });
  await refreshSnapshot();
}
export async function deleteExpense(id: string) {
  await db().expenses.delete(id);
}

export async function saveMovement(m: Movement) {
  if (m.kind !== "valuation" && !(m.amount > 0)) throw new Error("Betrag muss größer als 0 sein.");
  if (m.kind === "transfer" && (!m.fromGoalId || m.fromGoalId === m.goalId)) throw new Error("Bitte zwei verschiedene Sparziele wählen.");
  await db().movements.put({ ...m, amount: round2(m.amount) });
  await refreshSnapshot();
}
export async function deleteMovement(id: string) {
  await db().transaction("rw", [db().movements, db().settings], async () => {
    await db().movements.delete(id);
    if (id.startsWith("auto_")) {
      const s = (await db().settings.get("main"))!;
      if (!s.skippedAuto.includes(id)) await db().settings.put({ ...s, skippedAuto: [...s.skippedAuto, id] });
    }
  });
  await refreshSnapshot();
}

/** Aktuellen Wert eines Ziels setzen (z. B. Depotwert) → Differenz als Wertänderung buchen. */
export async function setGoalValue(goal: Goal, movements: Movement[], newValue: number, date: string) {
  const diff = round2(newValue - goalBalance(goal, movements));
  if (diff === 0) return;
  await saveMovement({ id: uid("mv"), kind: "valuation", amount: diff, date, goalId: goal.id, note: diff > 0 ? "Wertzuwachs" : "Wertverlust", createdAt: new Date().toISOString() });
}

export async function saveGoal(g: Goal) {
  await db().goals.put(g);
  await refreshSnapshot();
}
export async function deleteGoal(id: string) {
  await db().transaction("rw", [db().goals, db().movements, db().plan], async () => {
    await db().goals.delete(id);
    await db().movements.where("goalId").equals(id).delete();
    const transfersFrom = await db().movements.filter((m) => m.fromGoalId === id).toArray();
    await db().movements.bulkDelete(transfersFrom.map((m) => m.id));
    const plans = await db().plan.filter((p) => p.goalId === id).toArray();
    for (const p of plans) await db().plan.put({ ...p, goalId: undefined, autoBook: false });
  });
  await refreshSnapshot();
}

export async function saveAccount(a: Account) {
  await db().accounts.put(a);
  await refreshSnapshot();
}
export async function deleteAccount(id: string) {
  await db().accounts.delete(id);
  await refreshSnapshot();
}
export async function savePlanItem(p: PlanItem) {
  await db().plan.put(p);
}
export async function deletePlanItem(id: string) {
  await db().plan.delete(id);
}
export async function saveDebt(d: Debt) {
  await db().debts.put(d);
  await refreshSnapshot();
}
export async function deleteDebt(id: string) {
  await db().debts.delete(id);
  await refreshSnapshot();
}
export async function updateSettings(patch: Partial<Settings>) {
  const s = await db().settings.get("main");
  if (s) await db().settings.put({ ...s, ...patch });
}
export async function resetAll() {
  await replaceAll(initialData());
}

/* ───────── Backup ───────── */

const month = z.string().regex(/^\d{4}-\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const num = z.number().finite();

export const backupSchema = z.object({
  app: z.literal("kewin-finance"),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    settings: z.object({ id: z.literal("main"), ownerName: z.string(), personalBudget: num, travelBudget: num, autoBookFrom: month, skippedAuto: z.array(z.string()), createdAt: z.string() }),
    plan: z.array(z.object({ id: z.string(), name: z.string(), amount: num, kind: z.enum(["income", "fixed", "savings"]), dayOfMonth: z.number().int(), startMonth: month.optional(), endMonth: month.optional(), goalId: z.string().optional(), autoBook: z.boolean().optional() })),
    expenses: z.array(z.object({ id: z.string(), amount: num.positive(), category: z.enum(CATEGORIES), date, note: z.string().optional(), createdAt: z.string() })),
    goals: z.array(z.object({ id: z.string(), name: z.string(), type: z.enum(["property", "travel", "emergency", "investment", "custom"]), target: num, startAmount: num, monthlyPlan: num, targetDate: date.optional(), createdAt: z.string(), order: num })),
    movements: z.array(z.object({ id: z.string(), kind: z.enum(["deposit", "withdrawal", "transfer", "valuation"]), amount: num, date, goalId: z.string(), fromGoalId: z.string().optional(), note: z.string().optional(), planItemId: z.string().optional(), createdAt: z.string() })),
    accounts: z.array(z.object({ id: z.string(), name: z.string(), type: z.enum(["bank", "tagesgeld", "investment", "other"]), balance: num, balanceSetAt: z.string(), isMainBank: z.boolean().optional() })),
    debts: z.array(z.object({ id: z.string(), name: z.string(), balance: num, asOfMonth: month, monthlyPayment: num, dueDay: z.number().int(), endMonth: month.optional(), isEstimate: z.boolean().optional() })),
    snapshots: z.array(z.object({ month, assets: num, debts: num, netWorth: num, updatedAt: z.string() })),
  }),
});

export async function exportBackup(): Promise<string> {
  return JSON.stringify({ app: "kewin-finance", version: 1, exportedAt: new Date().toISOString(), data: await loadAll() }, null, 2);
}

export async function importBackup(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Die Datei ist kein gültiges JSON." };
  }
  const r = backupSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: `Kein gültiges KEWIN-FINANCE-Backup (${r.error.issues[0]?.path.join(".")}: ${r.error.issues[0]?.message}).` };
  await replaceAll(r.data.data as FinanceData);
  return { ok: true };
}
