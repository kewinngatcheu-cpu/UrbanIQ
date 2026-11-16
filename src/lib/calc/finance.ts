/**
 * Alle Berechnungen von KEWIN FINANCE – reine Funktionen, vollständig getestet.
 *
 * Grundregel Sparen: Eine Einzahlung in ein Sparziel ist KEINE Ausgabe. Sie verschiebt Geld vom
 * Bankguthaben in eine Rücklage. Dadurch sinkt das verfügbare Monatsgeld, das Nettovermögen bleibt gleich.
 */
import type { Account, Category, Debt, FinanceData, Goal, GoalType, Month, Movement, PlanItem, Snapshot } from "../types";
import { CATEGORIES, TRAVEL_CATEGORY } from "../types";
import { addMonths, inRange, monthDiff, toMonth } from "./months";
import { round2 } from "../format";

/* ───────────── Plan ───────────── */

export const isActive = (p: PlanItem, m: Month) => inRange(m, p.startMonth, p.endMonth);

export interface MonthPlan {
  income: number;
  fixed: number;
  savingsPlans: number;
  personalBudget: number;
  travelBudget: number;
  /** frei für Sparziele = Einkommen − Fixkosten − Sparpläne − Budgets */
  free: number;
  activeItems: PlanItem[];
}

export function planForMonth(data: Pick<FinanceData, "plan" | "settings">, m: Month): MonthPlan {
  const active = data.plan.filter((p) => isActive(p, m));
  const sum = (k: PlanItem["kind"]) => round2(active.filter((p) => p.kind === k).reduce((s, p) => s + p.amount, 0));
  const income = sum("income");
  const fixed = sum("fixed");
  const savingsPlans = sum("savings");
  const { personalBudget, travelBudget } = data.settings;
  return { income, fixed, savingsPlans, personalBudget, travelBudget, free: round2(income - fixed - savingsPlans - personalBudget - travelBudget), activeItems: active };
}

/* ───────────── Monatsübersicht ───────────── */

export interface MonthSummary {
  month: Month;
  plan: MonthPlan;
  income: number;
  fixed: number;
  variable: number; // eingetragene Ausgaben
  personalSpent: number;
  personalLeft: number;
  travelSpent: number;
  travelLeft: number;
  saved: number; // Einzahlungen − Entnahmen (ohne Umschichtungen & Wertänderungen)
  invested: number; // davon in Investment-Ziele
  remaining: number; // Einkommen − Fixkosten − Ausgaben − Gespartes
  savingsRate: number | null;
  byCategory: Record<Category, number>;
  expenseCount: number;
}

export function savedInMonth(movements: Movement[], m: Month, goals?: Goal[], type?: GoalType): number {
  const ok = (goalId: string) => !type || goals?.find((g) => g.id === goalId)?.type === type;
  return round2(
    movements
      .filter((mv) => mv.date.startsWith(m) && ok(mv.goalId))
      .reduce((s, mv) => s + (mv.kind === "deposit" ? mv.amount : mv.kind === "withdrawal" ? -mv.amount : 0), 0),
  );
}

export function monthSummary(data: FinanceData, m: Month): MonthSummary {
  const plan = planForMonth(data, m);
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const list = data.expenses.filter((e) => e.date.startsWith(m));
  for (const e of list) byCategory[e.category] = round2(byCategory[e.category] + e.amount);
  const variable = round2(list.reduce((s, e) => s + e.amount, 0));
  const travelSpent = byCategory[TRAVEL_CATEGORY];
  const personalSpent = round2(variable - travelSpent);
  const saved = savedInMonth(data.movements, m);
  const invested = savedInMonth(data.movements, m, data.goals, "investment");
  return {
    month: m,
    plan,
    income: plan.income,
    fixed: plan.fixed,
    variable,
    personalSpent,
    personalLeft: round2(plan.personalBudget - personalSpent),
    travelSpent,
    travelLeft: round2(plan.travelBudget - travelSpent),
    saved,
    invested,
    remaining: round2(plan.income - plan.fixed - variable - saved),
    savingsRate: plan.income > 0 ? saved / plan.income : null,
    byCategory,
    expenseCount: list.length,
  };
}

/* ───────────── Sparziele ───────────── */

/** Stand eines Ziels (optional bis einschließlich Datum). */
export function goalBalance(goal: Goal, movements: Movement[], upTo?: string): number {
  let b = goal.startAmount;
  for (const mv of movements) {
    if (upTo && mv.date > upTo) continue;
    if (mv.kind === "transfer") {
      if (mv.goalId === goal.id) b += mv.amount;
      if (mv.fromGoalId === goal.id) b -= mv.amount;
      continue;
    }
    if (mv.goalId !== goal.id) continue;
    if (mv.kind === "deposit" || mv.kind === "valuation") b += mv.amount;
    else if (mv.kind === "withdrawal") b -= mv.amount;
  }
  return round2(b);
}

export interface GoalStats {
  current: number;
  missing: number;
  progress: number; // 0..100
  monthlyRate: number; // effektive Sparrate/Monat
  rateSource: "plan" | "average" | "none";
  monthsLeft: number | null;
  etaMonth: Month | null;
  onTrack: boolean | null; // erreicht vor Zieldatum?
  requiredMonthly: number | null; // nötig, um Zieldatum zu halten
}

export function goalStats(goal: Goal, data: FinanceData, now: Date): GoalStats {
  const month = toMonth(now);
  const current = goalBalance(goal, data.movements);
  const missing = round2(Math.max(0, goal.target - current));
  const plans = data.plan.filter((p) => p.kind === "savings" && p.goalId === goal.id && isActive(p, month)).reduce((s, p) => s + p.amount, 0);
  let monthlyRate = goal.monthlyPlan + plans;
  let rateSource: GoalStats["rateSource"] = monthlyRate > 0 ? "plan" : "none";
  if (monthlyRate <= 0) {
    // Ø der Einzahlungen der letzten 3 Monate
    const avg = [1, 2, 3].map((i) => savedInMonth(data.movements.filter((mv) => mv.goalId === goal.id), addMonths(month, -i))).reduce((s, v) => s + v, 0) / 3;
    if (avg > 0) {
      monthlyRate = round2(avg);
      rateSource = "average";
    }
  }
  const monthsLeft = missing === 0 ? 0 : monthlyRate > 0 ? Math.ceil(missing / monthlyRate) : null;
  const etaMonth = monthsLeft === null ? null : addMonths(month, monthsLeft);
  const targetMonth = goal.targetDate ? toMonth(goal.targetDate) : null;
  const monthsToDate = targetMonth ? Math.max(0, monthDiff(month, targetMonth)) : null;
  return {
    current,
    missing,
    progress: goal.target > 0 ? Math.min(100, (current / goal.target) * 100) : 0,
    monthlyRate: round2(monthlyRate),
    rateSource,
    monthsLeft,
    etaMonth,
    onTrack: targetMonth && etaMonth ? etaMonth <= targetMonth : targetMonth ? missing === 0 : null,
    requiredMonthly: monthsToDate !== null ? (monthsToDate === 0 ? missing : round2(missing / monthsToDate)) : null,
  };
}

/** Sparplan-Buchungen, die bis heute fällig sind und noch fehlen (idempotente IDs). */
export function dueAutoBookings(data: FinanceData, now: Date): Movement[] {
  const today = toMonth(now);
  const day = now.getDate();
  const ids = new Set(data.movements.map((m) => m.id));
  const skipped = new Set(data.settings.skippedAuto);
  const out: Movement[] = [];
  for (const p of data.plan) {
    if (p.kind !== "savings" || !p.autoBook || !p.goalId || !data.goals.some((g) => g.id === p.goalId)) continue;
    let m = p.startMonth && p.startMonth > data.settings.autoBookFrom ? p.startMonth : data.settings.autoBookFrom;
    for (; m <= today; m = addMonths(m, 1)) {
      if (!isActive(p, m)) continue;
      if (m === today && day < p.dayOfMonth) continue;
      const id = `auto_${p.id}_${m}`;
      if (ids.has(id) || skipped.has(id)) continue;
      out.push({ id, kind: "deposit", amount: p.amount, date: `${m}-${String(p.dayOfMonth).padStart(2, "0")}`, goalId: p.goalId, note: `${p.name} (Sparplan)`, planItemId: p.id, createdAt: now.toISOString() });
    }
  }
  return out;
}

/* ───────────── Vermögen ───────────── */

/** Bankguthaben: eingetragener Stand, verrechnet mit Sparbewegungen, die danach erfasst wurden. */
export function accountBalance(acc: Account, movements: Movement[]): number {
  if (!acc.isMainBank) return round2(acc.balance);
  let b = acc.balance;
  for (const mv of movements) {
    if (mv.createdAt <= acc.balanceSetAt) continue;
    if (mv.kind === "deposit") b -= mv.amount;
    if (mv.kind === "withdrawal") b += mv.amount;
  }
  return round2(b);
}

/** Restschuld zum Zeitpunkt `now` (Rate wird am Fälligkeitstag abgezogen). */
export function debtBalance(d: Debt, now: Date): number {
  const month = toMonth(now);
  let payments = monthDiff(d.asOfMonth, month);
  if (payments > 0 && now.getDate() < d.dueDay) payments -= 1;
  if (d.endMonth) payments = Math.min(payments, Math.max(0, monthDiff(d.asOfMonth, d.endMonth)));
  return round2(Math.max(0, d.balance - Math.max(0, payments) * d.monthlyPayment));
}

export const WEALTH_GROUPS = ["Bankguthaben", "Tagesgeld", "Immobilienrücklagen", "Trade Republic & Investments", "Sonstige Investments", "Sonstige Ersparnisse"] as const;
export type WealthGroup = (typeof WEALTH_GROUPS)[number];

export const GOAL_GROUP: Record<GoalType, WealthGroup> = {
  property: "Immobilienrücklagen",
  emergency: "Tagesgeld",
  investment: "Trade Republic & Investments",
  travel: "Sonstige Ersparnisse",
  custom: "Sonstige Ersparnisse",
};
export const ACCOUNT_GROUP: Record<Account["type"], WealthGroup> = {
  bank: "Bankguthaben",
  tagesgeld: "Tagesgeld",
  investment: "Sonstige Investments",
  other: "Sonstige Ersparnisse",
};

export interface Wealth {
  groups: Record<WealthGroup, number>;
  assets: number;
  debts: number;
  netWorth: number;
}

export function wealth(data: FinanceData, now: Date): Wealth {
  const groups = Object.fromEntries(WEALTH_GROUPS.map((g) => [g, 0])) as Record<WealthGroup, number>;
  for (const a of data.accounts) groups[ACCOUNT_GROUP[a.type]] += accountBalance(a, data.movements);
  for (const g of data.goals) groups[GOAL_GROUP[g.type]] += goalBalance(g, data.movements);
  for (const k of WEALTH_GROUPS) groups[k] = round2(groups[k]);
  const assets = round2(WEALTH_GROUPS.reduce((s, k) => s + groups[k], 0));
  const debts = round2(data.debts.reduce((s, d) => s + debtBalance(d, now), 0));
  return { groups, assets, debts, netWorth: round2(assets - debts) };
}

export function makeSnapshot(data: FinanceData, now: Date): Snapshot {
  const w = wealth(data, now);
  return { month: toMonth(now), assets: w.assets, debts: w.debts, netWorth: w.netWorth, updatedAt: now.toISOString() };
}

/* ───────────── Hinweise ───────────── */

/** Kommende Planänderungen (z. B. Kreditende) – wie viel Geld wird ab wann frei? */
export function upcomingChanges(data: FinanceData, now: Date) {
  const month = toMonth(now);
  return data.plan
    .flatMap((p) => {
      const out: { month: Month; item: PlanItem; delta: number }[] = [];
      const sign = p.kind === "income" ? 1 : -1;
      if (p.endMonth && p.endMonth >= month) out.push({ month: addMonths(p.endMonth, 1), item: p, delta: -sign * p.amount });
      if (p.startMonth && p.startMonth > month) out.push({ month: p.startMonth, item: p, delta: sign * p.amount });
      return out;
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}
