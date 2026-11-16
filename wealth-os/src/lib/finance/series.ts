import type { FinanceData, Month } from "../types";
import { addMonths, monthRange, toMonth } from "./months";
import { actualsForMonth, planForMonth } from "./plan";
import { wealthHistory, wealthSummary, type WealthHistoryPoint } from "./wealth";

/** Letzte n Monate inkl. aktuellem Monat. */
export function lastMonths(now: Date, n: number): Month[] {
  return monthRange(addMonths(toMonth(now), -(n - 1)), n);
}

/** Vermögenshistorie aus Snapshots + Live-Wert für den laufenden Monat. */
export function historyWithCurrent(data: FinanceData, now: Date, n = 12): WealthHistoryPoint[] {
  const months = lastMonths(now, n);
  const cur = toMonth(now);
  const hist = wealthHistory(data, months.filter((m) => m !== cur));
  const s = wealthSummary(data);
  return [
    ...hist,
    { month: cur, liquid: s.liquid, property: s.property, invested: s.invested, other: s.other, total: s.totalAssets, investedContributions: s.contributionsInvested },
  ];
}

/** Einnahmen/Ausgaben/Sparquote je Monat – nur Monate mit Buchungen haben Ist-Werte. */
export function cashflowSeries(data: FinanceData, now: Date, n = 6) {
  return lastMonths(now, n).map((month) => {
    const a = actualsForMonth(data.transactions, month);
    const p = planForMonth(data, month);
    return {
      month,
      hasData: a.hasData,
      income: a.hasData ? a.income : null,
      spending: a.hasData ? a.spending : null,
      savingsRate: a.savingsRate !== null ? Math.round(a.savingsRate * 1000) / 10 : null,
      plannedRate: Math.round(p.savingsRate * 1000) / 10,
      plannedIncome: p.income,
      plannedSpending: p.plannedSpending,
    };
  });
}
