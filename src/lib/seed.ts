/**
 * Ausgangsdaten aus Kewins Angaben. Es werden KEINE Kontostände oder Transaktionen erfunden:
 * Alle Guthaben starten bei 0 € und werden von dir eingetragen.
 */
import type { FinanceData, Goal, PlanItem } from "./types";
import { addMonths, monthDiff, toMonth } from "./calc/months";

export const GOAL_IDS = {
  property: "goal_property",
  travel: "goal_travel",
  emergency: "goal_emergency",
  investment: "goal_investment",
  custom: "goal_custom",
} as const;

export function initialData(now: Date = new Date()): FinanceData {
  const month = toMonth(now);
  const iso = now.toISOString();
  const fixed = (id: string, name: string, amount: number, dayOfMonth = 1, endMonth?: string): PlanItem => ({ id, name, amount, kind: "fixed", dayOfMonth, endMonth });

  const plan: PlanItem[] = [
    { id: "plan_income", name: "Nettoeinkommen", amount: 1400, kind: "income", dayOfMonth: 1 },
    fixed("plan_loan", "Kredit", 161, 1, "2027-03"),
    fixed("plan_gym", "Fitnessstudio", 28),
    fixed("plan_phone", "Handyvertrag", 45),
    fixed("plan_aok", "AOK", 150),
    fixed("plan_claude", "Claude", 22),
    fixed("plan_chatgpt", "ChatGPT", 7),
    fixed("plan_apple", "Apple", 9),
    fixed("plan_spotify", "Spotify", 10),
    { id: "plan_tr", name: "Trade Republic", amount: 150, kind: "savings", dayOfMonth: 2, goalId: GOAL_IDS.investment, autoBook: true },
  ];

  const g = (id: string, name: string, type: Goal["type"], target: number, monthlyPlan: number, order: number): Goal => ({ id, name, type, target, startAmount: 0, monthlyPlan, createdAt: iso, order });
  const goals: Goal[] = [
    g(GOAL_IDS.property, "Immobilie / Eigenkapital", "property", 30_000, 418, 1),
    g(GOAL_IDS.travel, "Reisen", "travel", 1_200, 0, 2),
    g(GOAL_IDS.emergency, "Notgroschen", "emergency", 3_000, 0, 3),
    g(GOAL_IDS.investment, "Investments / Vermögensaufbau", "investment", 10_000, 0, 4),
    g(GOAL_IDS.custom, "Individuelles Sparziel", "custom", 1_000, 0, 5),
  ];

  // Kredit: Rate am 1. fällig. Restschuld = verbleibende Raten × 161 € (ohne Zinsen) → als Schätzung markiert.
  const remainingRates = Math.max(0, monthDiff(month, "2027-03"));

  return {
    // Sparpläne werden erst ab dem nächsten Monat automatisch gebucht – nichts Rückwirkendes erfinden
    settings: { id: "main", ownerName: "Kewin Ngatcheu", personalBudget: 200, travelBudget: 200, autoBookFrom: addMonths(month, 1), skippedAuto: [], createdAt: iso },
    plan,
    expenses: [],
    goals,
    movements: [],
    accounts: [{ id: "acc_bank", name: "Girokonto", type: "bank", balance: 0, balanceSetAt: iso, isMainBank: true }],
    debts: [{ id: "debt_loan", name: "Kredit", balance: remainingRates * 161, asOfMonth: month, monthlyPayment: 161, dueDay: 1, endMonth: "2027-03", isEstimate: true }],
    snapshots: [],
  };
}
