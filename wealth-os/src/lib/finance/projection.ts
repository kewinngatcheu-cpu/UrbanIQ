import type { FinanceData, Month } from "../types";
import { addMonths } from "./months";
import { planForMonth } from "./plan";
import { wealthSummary } from "./wealth";
import { round2 } from "../format";

export type ScenarioKey = "conservative" | "realistic" | "ambitious";

export interface ScenarioParams {
  key: ScenarioKey;
  label: string;
  investReturnPct: number; // erwartete Rendite p.a. Investments (ANNAHME)
  investVolPct: number; // Volatilität p.a. für Schwankungsband
  safeRatePct: number; // Tagesgeld-Zins p.a. (ANNAHME)
  incomeGrowthPct: number; // Gehaltssteigerung p.a.
  inflationPct: number; // Steigerung der variablen Ausgaben p.a.
}

export function scenarioPresets(salaryGrowthPct: number, safeInterestPct: number): Record<ScenarioKey, ScenarioParams> {
  return {
    conservative: {
      key: "conservative",
      label: "Konservativ",
      investReturnPct: 2,
      investVolPct: 15,
      safeRatePct: Math.max(0, safeInterestPct - 1),
      incomeGrowthPct: 0,
      inflationPct: 3,
    },
    realistic: {
      key: "realistic",
      label: "Realistisch",
      investReturnPct: 5,
      investVolPct: 15,
      safeRatePct: safeInterestPct,
      incomeGrowthPct: salaryGrowthPct,
      inflationPct: 2,
    },
    ambitious: {
      key: "ambitious",
      label: "Ambitioniert",
      investReturnPct: 7,
      investVolPct: 15,
      safeRatePct: safeInterestPct + 0.5,
      incomeGrowthPct: salaryGrowthPct + 2,
      inflationPct: 2,
    },
  };
}

export interface SimulatorOverrides {
  /** Ersetzt das aktuelle Netto-Einkommen (Basis) – null = aus Daten. */
  netIncome?: number | null;
  /** Zusätzliche monatliche Ersparnis durch weniger Ausgaben (negativ = mehr Ausgaben). */
  spendingDelta?: number;
  /** Abweichende monatliche Investmentrate – null = aus Daten. */
  monthlyInvestment?: number | null;
  /** Anteil des Überschusses, der ins Immobilien-Eigenkapital fließt (Rest: Liquidität). */
  surplusToPropertyPct?: number;
  /** Einkommensänderung (z. B. Berufseinstieg) ab Monat. */
  careerStart?: { month: Month; netIncome: number } | null;
}

export interface ProjectionPoint {
  month: Month;
  index: number; // 0 = heute
  income: number;
  spending: number;
  investContribution: number;
  surplus: number;
  liquid: number;
  property: number;
  invested: number;
  investedLow: number;
  investedHigh: number;
  investedContributions: number;
  debt: number;
  safe: number; // liquid + property (sicheres Sparguthaben)
  netWorth: number;
}

export function project(
  data: FinanceData,
  startMonth: Month,
  horizonMonths: number,
  params: ScenarioParams,
  overrides: SimulatorOverrides = {},
): ProjectionPoint[] {
  const summary = wealthSummary(data);
  let liquid = summary.liquid + summary.other;
  let property = summary.property;
  let invested = summary.invested;
  let contributions = summary.contributionsInvested;
  const debts = data.debts.map((d) => ({ ...d }));
  const debtTotal = () => debts.reduce((s, d) => s + d.balance, 0);

  const basePlan = planForMonth(data, startMonth);
  const baseIncome = overrides.netIncome ?? basePlan.income;
  const career = overrides.careerStart === undefined ? data.settings.careerStart : overrides.careerStart;
  const toProperty = (overrides.surplusToPropertyPct ?? 100) / 100;

  const rSafe = params.safeRatePct / 100 / 12;
  const rInv = params.investReturnPct / 100 / 12;

  const points: ProjectionPoint[] = [
    {
      month: startMonth,
      index: 0,
      income: baseIncome,
      spending: basePlan.plannedSpending,
      investContribution: overrides.monthlyInvestment ?? basePlan.investments,
      surplus: basePlan.surplus,
      liquid: round2(liquid),
      property: round2(property),
      invested: round2(invested),
      investedLow: round2(invested),
      investedHigh: round2(invested),
      investedContributions: round2(contributions),
      debt: round2(debtTotal()),
      safe: round2(liquid + property),
      netWorth: round2(liquid + property + invested - debtTotal()),
    },
  ];

  for (let i = 1; i <= horizonMonths; i++) {
    const month = addMonths(startMonth, i);
    const plan = planForMonth(data, month);
    const years = Math.floor((i - 1) / 12);
    const growth = Math.pow(1 + params.incomeGrowthPct / 100, years);
    const infl = Math.pow(1 + params.inflationPct / 100, years);

    // Einkommen: Basis (Override) – Veränderungen in den Daten (z. B. neue Einkommensquelle) werden mitgenommen
    let income = baseIncome + (plan.income - basePlan.income);
    if (career && month >= career.month) income = career.netIncome;
    income = income * growth;

    const spending = plan.fixedCosts + plan.variableBudget * infl - (overrides.spendingDelta ?? 0);
    const investContribution = overrides.monthlyInvestment ?? plan.investments;
    const savingsPlans = plan.savingsPlans;
    const surplus = income - spending - investContribution - savingsPlans;

    // Zinsen / Rendite
    liquid *= 1 + rSafe;
    property *= 1 + rSafe;
    invested *= 1 + rInv;

    invested += investContribution;
    contributions += investContribution;
    liquid += savingsPlans;
    if (surplus >= 0) {
      property += surplus * toProperty;
      liquid += surplus * (1 - toProperty);
    } else {
      // Defizit: zuerst Liquidität, dann Immobilien-Rücklage
      liquid += surplus;
      if (liquid < 0) {
        property += liquid;
        liquid = 0;
      }
    }

    // Schulden: Raten aus Fixkosten (Kategorie Kredite) reduzieren Restschuld
    for (const d of debts) {
      if (d.balance <= 0) continue;
      if (d.endMonth && month > d.endMonth) continue;
      const interest = (d.balance * d.interestRate) / 100 / 12;
      d.balance = Math.max(0, d.balance + interest - d.monthlyPayment);
    }

    const t = i / 12;
    const sigma = (params.investVolPct / 100) * Math.sqrt(t);
    points.push({
      month,
      index: i,
      income: round2(income),
      spending: round2(spending),
      investContribution: round2(investContribution),
      surplus: round2(surplus),
      liquid: round2(liquid),
      property: round2(property),
      invested: round2(invested),
      investedLow: round2(Math.max(0, invested * (1 - sigma))),
      investedHigh: round2(invested * (1 + sigma)),
      investedContributions: round2(contributions),
      debt: round2(debtTotal()),
      safe: round2(liquid + property),
      netWorth: round2(liquid + property + invested - debtTotal()),
    });
  }
  return points;
}

/** Erster Monat, in dem das Immobilien-Eigenkapital den Zielbetrag erreicht. */
export function monthWhenPropertyReaches(points: ProjectionPoint[], target: number): ProjectionPoint | null {
  return points.find((p) => p.property >= target) ?? null;
}
