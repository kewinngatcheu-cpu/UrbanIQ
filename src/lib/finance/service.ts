import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { addMonths, berlinDay, monthOf } from "@/lib/time";
import {
  CATEGORIES, KINDS, baselineFrom, budgetStatus, project, spendableThisMonth, summarizeMonth,
  type Scenario, type Tx,
} from "./calc";
import { parseBankCsv } from "./csv";

export interface Transaction extends Tx { id: string; description: string; source: string; created_at: string }

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const txInput = z.object({
  day,
  amount: z.number().positive().max(10_000_000), // euros, always positive – sign comes from kind
  kind: z.enum(KINDS),
  category: z.string().refine((c) => c in CATEGORIES, "Unbekannte Kategorie"),
  description: z.string().max(300).default(""),
});

const COLS = `id, to_char(day,'YYYY-MM-DD') AS day, amount_cents::float8 AS amount_cents, kind, category, description, source, created_at`;

export async function listTransactions(opts: { month?: string; limit?: number } = {}): Promise<Transaction[]> {
  const db = await getDb();
  if (opts.month) {
    return db.query<Transaction>(`SELECT ${COLS} FROM finance_transactions WHERE to_char(day,'YYYY-MM') = $1 ORDER BY day DESC, created_at DESC`, [opts.month]);
  }
  return db.query<Transaction>(`SELECT ${COLS} FROM finance_transactions ORDER BY day DESC, created_at DESC LIMIT $1`, [opts.limit ?? 100]);
}

export async function addTransaction(raw: z.input<typeof txInput>) {
  const t = txInput.parse(raw);
  const cents = Math.round(t.amount * 100) * (t.kind === "income" ? 1 : -1);
  const db = await getDb();
  const [row] = await db.query<{ id: string }>(
    `INSERT INTO finance_transactions (day, amount_cents, kind, category, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [t.day, cents, t.kind, t.category, t.description]);
  await audit({ actor: "owner", action: "finance.tx.create", target: row.id, workspaceId: "personal", level: 3, details: { kind: t.kind, category: t.category } });
  return row;
}

export async function deleteTransaction(id: string) {
  const db = await getDb();
  const rows = await db.query(`DELETE FROM finance_transactions WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) throw new Error("Buchung nicht gefunden");
  await audit({ actor: "owner", action: "finance.tx.delete", target: id, workspaceId: "personal", level: 3 });
}

export async function updateTransactionCategory(id: string, category: string) {
  if (!(category in CATEGORIES)) throw new Error("Unbekannte Kategorie");
  const kind = CATEGORIES[category].kind;
  const db = await getDb();
  // Keep the sign consistent with the new kind.
  const rows = await db.query(
    `UPDATE finance_transactions SET category = $2, kind = $3,
       amount_cents = CASE WHEN $3 = 'income' THEN abs(amount_cents) ELSE -abs(amount_cents) END
     WHERE id = $1 RETURNING id`, [id, category, kind]);
  if (!rows.length) throw new Error("Buchung nicht gefunden");
  await audit({ actor: "owner", action: "finance.tx.recategorize", target: id, workspaceId: "personal", level: 3, details: { category } });
}

/** CSV import: preview (dryRun) or import. Duplicates (same hash) are skipped, never double-counted. */
export async function importCsv(text: string, dryRun: boolean) {
  if (text.length > 2_000_000) throw new Error("Datei zu groß (max. 2 MB).");
  const parsed = parseBankCsv(text);
  const db = await getDb();
  const existing = parsed.rows.length
    ? new Set((await db.query<{ import_hash: string }>(`SELECT import_hash FROM finance_transactions WHERE import_hash = ANY($1::text[])`,
        [parsed.rows.map((r) => r.import_hash)])).map((r) => r.import_hash))
    : new Set<string>();
  const fresh = parsed.rows.filter((r) => !existing.has(r.import_hash));
  if (!dryRun && fresh.length) {
    await db.transaction(async (tx) => {
      for (const r of fresh) {
        await tx.query(
          `INSERT INTO finance_transactions (day, amount_cents, kind, category, description, source, import_hash)
           VALUES ($1,$2,$3,$4,$5,'csv',$6) ON CONFLICT (import_hash) DO NOTHING`,
          [r.day, r.amount_cents, r.kind, r.category, r.description, r.import_hash]);
      }
    });
    await audit({ actor: "owner", action: "finance.import", workspaceId: "personal", level: 3, details: { imported: fresh.length, duplicates: parsed.rows.length - fresh.length, skipped: parsed.skipped.length } });
  }
  return { columns: parsed.columns, total: parsed.rows.length, newRows: fresh.length, duplicates: parsed.rows.length - fresh.length,
    skipped: parsed.skipped.slice(0, 20), preview: fresh.slice(0, 15), imported: !dryRun };
}

export async function getBudgets(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.query<{ category: string; monthly_cents: number }>(`SELECT category, monthly_cents::float8 AS monthly_cents FROM finance_budgets`);
  return Object.fromEntries(rows.map((r) => [r.category, r.monthly_cents]));
}

export async function setBudget(category: string, euros: number) {
  if (!(category in CATEGORIES)) throw new Error("Unbekannte Kategorie");
  if (!(euros >= 0 && euros < 1_000_000)) throw new Error("Ungültiger Betrag");
  const db = await getDb();
  if (euros === 0) await db.query(`DELETE FROM finance_budgets WHERE category = $1`, [category]);
  else await db.query(
    `INSERT INTO finance_budgets (category, monthly_cents) VALUES ($1,$2) ON CONFLICT (category) DO UPDATE SET monthly_cents = $2, updated_at = now()`,
    [category, Math.round(euros * 100)]);
  await audit({ actor: "owner", action: "finance.budget.set", workspaceId: "personal", level: 3, details: { category, euros } });
}

/** Everything the finance dashboard, the briefing and the AI context need – computed from real bookings only. */
export async function financeOverview(today = berlinDay()) {
  const month = monthOf(today);
  const db = await getDb();
  const from = `${addMonths(month, -6)}-01`;
  const txs = await db.query<Tx>(
    `SELECT to_char(day,'YYYY-MM-DD') AS day, amount_cents::float8 AS amount_cents, kind, category FROM finance_transactions WHERE day >= $1`, [from]);
  const [{ n }] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM finance_transactions`);
  const current = summarizeMonth(month, txs);
  // Baseline: up to 3 previous months that actually contain bookings.
  const prev = [1, 2, 3, 4, 5, 6].map((i) => addMonths(month, -i))
    .filter((m) => txs.some((t) => t.day.startsWith(m))).slice(0, 3).map((m) => summarizeMonth(m, txs));
  const baseline = baselineFrom(prev);
  const budgets = await getBudgets();
  const settings = await getSettings();
  const history = [5, 4, 3, 2, 1, 0].map((i) => summarizeMonth(addMonths(month, -i), txs));
  return {
    hasData: n > 0,
    month,
    current,
    previous: prev[0] ?? null,
    baseline,
    budgets,
    budgetStatus: budgetStatus(budgets, current, { today }),
    spendable: n > 0 ? spendableThisMonth({ today, current, baseline, budgets }) : null,
    history,
    balances: { liquid: settings.financeLiquidCents, saved: settings.financeSavedCents, asOf: settings.financeBalanceAsOf },
  };
}

export async function runScenario(scenario: Scenario, months = 6, today = berlinDay()) {
  const o = await financeOverview(today);
  const base = o.baseline.months ? o.baseline : baselineFrom([o.current]);
  return {
    baselineMonths: o.baseline.months,
    baseline: base,
    reference: project({ startMonth: addMonths(o.month, 1), months, liquid: o.balances.liquid ?? 0, saved: o.balances.saved ?? 0, baseline: base }),
    scenario: project({ startMonth: addMonths(o.month, 1), months, liquid: o.balances.liquid ?? 0, saved: o.balances.saved ?? 0, baseline: base, scenario }),
    balancesKnown: o.balances.liquid != null,
  };
}
