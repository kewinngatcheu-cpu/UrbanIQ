import type {
  Budget,
  Category,
  ExpenseCategory,
  FinanceData,
  Month,
  RecurringItem,
  Transaction,
} from "../types";
import { CATEGORIES, SAVINGS_CATEGORIES } from "../types";
import { isMonthInRange, parseMonth } from "./months";
import { round2 } from "../format";

/** Betrag, der in einem bestimmten Monat fällig ist (Intervall + Laufzeit). */
export function recurringAmountForMonth(item: RecurringItem, month: Month): number {
  if (!isMonthInRange(month, item.startMonth, item.endMonth)) return 0;
  if (item.interval === "monthly") return item.amount;
  const start = parseMonth(item.startMonth);
  const cur = parseMonth(month);
  const diff = cur.y * 12 + cur.m - (start.y * 12 + start.m);
  if (item.interval === "quarterly") return diff % 3 === 0 ? item.amount : 0;
  return diff % 12 === 0 ? item.amount : 0;
}

/** Auf Monatsbasis normalisierter Betrag (z. B. Jahresabo / 12). */
export function recurringMonthlyEquivalent(item: RecurringItem): number {
  if (item.interval === "monthly") return item.amount;
  if (item.interval === "quarterly") return item.amount / 3;
  return item.amount / 12;
}

export function budgetForMonth(budgets: Budget[], category: ExpenseCategory, month: Month): number {
  return budgets
    .filter((b) => b.category === category && isMonthInRange(month, b.startMonth, b.endMonth))
    .reduce((s, b) => s + b.monthlyLimit, 0);
}

export interface MonthPlan {
  month: Month;
  income: number;
  fixedCosts: number; // wiederkehrende Ausgaben (inkl. Kredite)
  variableBudget: number; // Summe Kategorie-Budgets
  investments: number; // Sparpläne Investments
  savingsPlans: number; // feste Sparpläne (z. B. Notgroschen)
  plannedSpending: number; // fixedCosts + variableBudget
  plannedSavings: number; // investments + savingsPlans + surplus
  surplus: number; // frei verfügbarer Rest → Immobilien-Eigenkapital
  savingsRate: number; // plannedSavings / income
  byCategory: Record<ExpenseCategory, number>; // Soll je Kategorie
  items: { item: RecurringItem; amount: number }[];
}

export function emptyCategoryRecord(): Record<ExpenseCategory, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;
}

/** Monatsplan aus wiederkehrenden Posten + Budgets – berücksichtigt Start/Ende (z. B. Kredit bis 03/2027). */
export function planForMonth(data: Pick<FinanceData, "recurring" | "budgets">, month: Month): MonthPlan {
  const byCategory = emptyCategoryRecord();
  let income = 0;
  let fixedCosts = 0;
  let investments = 0;
  let savingsPlans = 0;
  const items: MonthPlan["items"] = [];

  for (const item of data.recurring) {
    const amount = recurringAmountForMonth(item, month);
    if (amount === 0) continue;
    items.push({ item, amount });
    switch (item.kind) {
      case "income":
        income += amount;
        break;
      case "expense":
        fixedCosts += amount;
        if (item.category !== "Einkommen") byCategory[item.category] += amount;
        break;
      case "investment":
        investments += amount;
        byCategory.Investments += amount;
        break;
      case "saving":
        savingsPlans += amount;
        byCategory.Sparen += amount;
        break;
    }
  }

  let variableBudget = 0;
  for (const c of CATEGORIES) {
    if (SAVINGS_CATEGORIES.includes(c)) continue;
    const b = budgetForMonth(data.budgets, c, month);
    variableBudget += b;
    byCategory[c] += b;
  }

  const plannedSpending = fixedCosts + variableBudget;
  const surplus = income - plannedSpending - investments - savingsPlans;
  const plannedSavings = investments + savingsPlans + Math.max(0, surplus);
  return {
    month,
    income: round2(income),
    fixedCosts: round2(fixedCosts),
    variableBudget: round2(variableBudget),
    investments: round2(investments),
    savingsPlans: round2(savingsPlans),
    plannedSpending: round2(plannedSpending),
    plannedSavings: round2(plannedSavings),
    surplus: round2(surplus),
    savingsRate: income > 0 ? plannedSavings / income : 0,
    byCategory,
    items,
  };
}

export interface MonthActuals {
  month: Month;
  hasData: boolean;
  income: number;
  spending: number; // Konsumausgaben (ohne Sparen/Investments)
  savingsTransfers: number; // Buchungen Sparen/Investments
  netSavings: number; // income - spending
  savingsRate: number | null;
  byCategory: Record<ExpenseCategory, number>;
  count: number;
}

export function transactionsInMonth(txs: Transaction[], month: Month): Transaction[] {
  return txs.filter((t) => t.date.startsWith(month));
}

export function isSavingsCategory(c: Category): boolean {
  return SAVINGS_CATEGORIES.includes(c);
}

export function actualsForMonth(txs: Transaction[], month: Month): MonthActuals {
  const list = transactionsInMonth(txs, month);
  const byCategory = emptyCategoryRecord();
  let income = 0;
  let spending = 0;
  let savingsTransfers = 0;
  for (const t of list) {
    if (t.type === "income") {
      income += t.amount;
      continue;
    }
    if (t.category === "Einkommen") continue;
    byCategory[t.category] += t.amount;
    if (isSavingsCategory(t.category)) savingsTransfers += t.amount;
    else spending += t.amount;
  }
  const netSavings = income - spending;
  return {
    month,
    hasData: list.length > 0,
    income: round2(income),
    spending: round2(spending),
    savingsTransfers: round2(savingsTransfers),
    netSavings: round2(netSavings),
    savingsRate: income > 0 ? netSavings / income : null,
    byCategory,
    count: list.length,
  };
}

export type BudgetStatus = "ok" | "warning" | "over" | "unplanned";

export interface CategoryComparison {
  category: ExpenseCategory;
  planned: number;
  actual: number;
  diff: number; // planned - actual (positiv = unter Budget)
  usedPct: number | null;
  status: BudgetStatus;
}

/** Soll-Ist-Vergleich je Kategorie inkl. Warnstatus. */
export function compareBudget(
  plan: MonthPlan,
  actuals: MonthActuals,
  warnThresholdPct = 80,
): CategoryComparison[] {
  return CATEGORIES.map((category) => {
    const planned = plan.byCategory[category];
    const actual = actuals.byCategory[category];
    const usedPct = planned > 0 ? (actual / planned) * 100 : null;
    let status: BudgetStatus = "ok";
    if (planned === 0 && actual > 0) status = "unplanned";
    else if (usedPct !== null && usedPct > 100.0001) status = "over";
    else if (usedPct !== null && usedPct >= warnThresholdPct) status = "warning";
    // Sparen/Investments: "über Budget" ist positiv – nie als Warnung markieren
    if (isSavingsCategory(category) && status !== "ok") status = "ok";
    return { category, planned: round2(planned), actual: round2(actual), diff: round2(planned - actual), usedPct, status };
  });
}

export interface BudgetAlert {
  category: ExpenseCategory | "Persönliches Budget";
  severity: "warning" | "over";
  message: string;
}

export function budgetAlerts(
  comparisons: CategoryComparison[],
  personalCategories: ExpenseCategory[],
  personalCap: number,
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const c of comparisons) {
    if (c.status === "over")
      alerts.push({ category: c.category, severity: "over", message: `${c.category}: Budget um ${Math.round(c.actual - c.planned)} € überschritten` });
    else if (c.status === "warning")
      alerts.push({ category: c.category, severity: "warning", message: `${c.category}: ${Math.round(c.usedPct ?? 0)} % des Budgets verbraucht` });
    else if (c.status === "unplanned")
      alerts.push({ category: c.category, severity: "warning", message: `${c.category}: ${Math.round(c.actual)} € ohne Budget ausgegeben` });
  }
  const personalSpent = comparisons
    .filter((c) => personalCategories.includes(c.category))
    .reduce((s, c) => s + c.actual, 0);
  if (personalCap > 0 && personalSpent > personalCap)
    alerts.unshift({
      category: "Persönliches Budget",
      severity: "over",
      message: `Persönliche Ausgaben ${Math.round(personalSpent)} € > Limit ${personalCap} €`,
    });
  return alerts;
}
