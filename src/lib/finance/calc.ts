/**
 * Personal-finance calculations. Pure functions (no DB) so every number JARVIS shows is reproducible and tested.
 * Convention: amounts in integer cents. Transactions: income > 0, every outflow < 0.
 */
import { daysBetween, daysInMonth } from "@/lib/time";

export const KINDS = ["income", "fixed", "variable", "savings", "investment"] as const;
export type Kind = (typeof KINDS)[number];

export const CATEGORIES: Record<string, { label: string; kind: Kind }> = {
  einkommen: { label: "Einkommen", kind: "income" },
  miete: { label: "Miete & Wohnen", kind: "fixed" },
  abos: { label: "Abos & Verträge", kind: "fixed" },
  versicherung: { label: "Versicherungen", kind: "fixed" },
  uni: { label: "Uni", kind: "fixed" },
  lebensmittel: { label: "Lebensmittel", kind: "variable" },
  transport: { label: "Transport", kind: "variable" },
  shopping: { label: "Shopping", kind: "variable" },
  freizeit: { label: "Freizeit", kind: "variable" },
  gesundheit: { label: "Gesundheit & Fitness", kind: "variable" },
  business: { label: "Business-Ausgaben", kind: "variable" },
  sonstiges: { label: "Sonstiges", kind: "variable" },
  sparen: { label: "Sparen", kind: "savings" },
  investments: { label: "Investments", kind: "investment" },
};

export interface Tx { day: string; amount_cents: number; kind: Kind; category: string }

export interface MonthSummary {
  month: string;
  income: number; fixed: number; variable: number; savings: number; investment: number; // all positive cents
  net: number;            // income − fixed − variable (money left before saving/investing)
  cashflow: number;       // income − all outflows (incl. savings/investments) = change of the liquid account
  savingsRate: number | null; // (savings + investment) / income
  byCategory: Record<string, number>; // positive outflow cents per category (income excluded)
}

export function summarizeMonth(month: string, txs: Tx[]): MonthSummary {
  const s: MonthSummary = { month, income: 0, fixed: 0, variable: 0, savings: 0, investment: 0, net: 0, cashflow: 0, savingsRate: null, byCategory: {} };
  for (const t of txs) {
    if (!t.day.startsWith(month)) continue;
    const abs = Math.abs(t.amount_cents);
    if (t.kind === "income") { s.income += t.amount_cents; continue; } // refunds etc. could be negative income
    s[t.kind] += abs;
    s.byCategory[t.category] = (s.byCategory[t.category] ?? 0) + abs;
  }
  s.net = s.income - s.fixed - s.variable;
  s.cashflow = s.net - s.savings - s.investment;
  s.savingsRate = s.income > 0 ? (s.savings + s.investment) / s.income : null;
  return s;
}

export interface Baseline { months: number; income: number; fixed: number; variable: number; savings: number; investment: number }

/** Average of the given complete months. `months: 0` means no history – callers must not invent numbers. */
export function baselineFrom(summaries: MonthSummary[]): Baseline {
  const n = summaries.length;
  const avg = (k: keyof Pick<MonthSummary, "income" | "fixed" | "variable" | "savings" | "investment">) =>
    n ? Math.round(summaries.reduce((a, s) => a + s[k], 0) / n) : 0;
  return { months: n, income: avg("income"), fixed: avg("fixed"), variable: avg("variable"), savings: avg("savings"), investment: avg("investment") };
}

export interface Spendable {
  expectedIncome: number; fixedCosts: number; plannedSaving: number; variableSpent: number;
  available: number;      // what can still be spent on variable costs this month
  perDay: number;         // available / remaining days (incl. today)
  daysLeft: number;
  basis: "actual" | "baseline" | "mixed";
  explanation: string[];
}

/**
 * "How much can I spend this month?"
 * expected income  = max(income booked this month, baseline income)
 * fixed costs      = max(fixed booked this month, baseline fixed)
 * planned saving   = savings+investment budgets if set, else max(booked, baseline)
 * available        = expected income − fixed − planned saving − variable already spent
 */
export function spendableThisMonth(args: { today: string; current: MonthSummary; baseline: Baseline; budgets: Record<string, number> }): Spendable {
  const { today, current, baseline, budgets } = args;
  const month = today.slice(0, 7);
  const explanation: string[] = [];
  const expectedIncome = Math.max(current.income, baseline.income);
  const fixedCosts = Math.max(current.fixed, baseline.fixed);
  const budgetSaving = (budgets.sparen ?? 0) + (budgets.investments ?? 0);
  const plannedSaving = budgetSaving > 0 ? Math.max(budgetSaving, current.savings + current.investment)
    : Math.max(current.savings + current.investment, baseline.savings + baseline.investment);
  const available = expectedIncome - fixedCosts - plannedSaving - current.variable;
  const daysLeft = daysBetween(today, `${month}-${String(daysInMonth(month)).padStart(2, "0")}`) + 1;
  const usedBaseline = baseline.months > 0 && (baseline.income > current.income || baseline.fixed > current.fixed);
  const basis = baseline.months === 0 ? "actual" : usedBaseline ? (current.income || current.fixed ? "mixed" : "baseline") : "actual";
  if (baseline.income > current.income) explanation.push(`Einkommen noch nicht vollständig gebucht – Durchschnitt der letzten ${baseline.months} Monate angesetzt.`);
  if (baseline.fixed > current.fixed) explanation.push(`Fixkosten teilweise noch offen – Durchschnitt angesetzt.`);
  if (budgetSaving > 0) explanation.push(`Spar-/Investmentbudget von ${(budgetSaving / 100).toFixed(2)} € reserviert.`);
  if (baseline.months === 0) explanation.push("Keine Vormonate erfasst – Berechnung nur auf Basis dieses Monats.");
  return { expectedIncome, fixedCosts, plannedSaving, variableSpent: current.variable, available, perDay: Math.floor(available / Math.max(1, daysLeft)), daysLeft, basis, explanation };
}

export interface BudgetStatus { category: string; budget: number; spent: number; ratio: number; state: "ok" | "warning" | "over" }

export function budgetStatus(budgets: Record<string, number>, current: MonthSummary, opts: { today: string }): BudgetStatus[] {
  const month = opts.today.slice(0, 7);
  const elapsed = Number(opts.today.slice(8, 10)) / daysInMonth(month);
  return Object.entries(budgets)
    .filter(([c, b]) => b > 0 && CATEGORIES[c]?.kind !== "income" && CATEGORIES[c]?.kind !== "savings" && CATEGORIES[c]?.kind !== "investment")
    .map(([category, budget]) => {
      const spent = current.byCategory[category] ?? 0;
      const ratio = spent / budget;
      // Warning when ≥ 80 % used, or spending runs clearly ahead of the month's progress.
      const state: BudgetStatus["state"] = ratio >= 1 ? "over" : ratio >= 0.8 || (ratio > elapsed + 0.25 && ratio >= 0.5) ? "warning" : "ok";
      return { category, budget, spent, ratio, state };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export interface Scenario {
  incomeChangePct?: number;   // e.g. +20 for a raise
  expenseChangePct?: number;  // applies to fixed + variable, e.g. -10
  rentChangeCents?: number;   // monthly change of rent (+ = more expensive)
  oneOffCents?: number;       // unexpected cost in month 1 (positive = cost)
  savingsRatePct?: number | null; // override: share of income moved to savings/investments
}

export interface ProjectionMonth { month: string; income: number; expenses: number; saving: number; liquid: number; saved: number }

/** Month-by-month projection of the liquid balance and accumulated savings. */
export function project(args: { startMonth: string; months: number; liquid: number; saved: number; baseline: Baseline; scenario?: Scenario }): ProjectionMonth[] {
  const { baseline: b, scenario: s = {} } = args;
  const income = Math.round(b.income * (1 + (s.incomeChangePct ?? 0) / 100));
  const expenses = Math.round((b.fixed + b.variable) * (1 + (s.expenseChangePct ?? 0) / 100)) + (s.rentChangeCents ?? 0);
  const saving = s.savingsRatePct != null ? Math.round(income * s.savingsRatePct / 100) : b.savings + b.investment;
  const out: ProjectionMonth[] = [];
  let liquid = args.liquid, saved = args.saved;
  for (let i = 0; i < args.months; i++) {
    const [y, m] = args.startMonth.split("-").map(Number);
    const month = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7);
    const oneOff = i === 0 ? (s.oneOffCents ?? 0) : 0;
    liquid += income - expenses - saving - oneOff;
    saved += saving;
    out.push({ month, income, expenses: expenses + oneOff, saving, liquid, saved });
  }
  return out;
}

/** Months needed to reach a savings target; null if the monthly saving is ≤ 0 (never). */
export function monthsToGoal(target: number, current: number, monthlySaving: number): number | null {
  if (current >= target) return 0;
  if (monthlySaving <= 0) return null;
  return Math.ceil((target - current) / monthlySaving);
}
