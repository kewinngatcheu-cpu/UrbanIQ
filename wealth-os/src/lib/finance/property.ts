import type { PropertyPlan, Region } from "../types";
import { round2 } from "../format";
import { annuityMonthlyRate, payoffMonths, remainingBalance } from "./loan";

/**
 * Kaufnebenkosten-Annahmen je Region.
 * Grunderwerbsteuer: gesetzliche Landessätze (Stand 11/2026, Berlin 6,0 %, Brandenburg 6,5 %).
 * Notar + Grundbuch: Erfahrungswert ~2,0 % (GNotKG-Gebühren, variiert mit Kaufpreis & Grundschuld).
 * Makler: Käuferanteil bei Teilung nach §656c BGB; marktüblich 3,57 % inkl. MwSt. – kann 0 sein.
 * → Diese Werte sind ANNAHMEN und in der App editierbar. Vor Kauf beim Notar/Finanzamt verifizieren.
 */
export const REGION_DEFAULTS: Record<Exclude<Region, "custom">, { label: string; transferTaxRate: number; notaryRate: number; brokerRate: number; source: string }> = {
  berlin: {
    label: "Berlin",
    transferTaxRate: 6.0,
    notaryRate: 2.0,
    brokerRate: 3.57,
    source: "GrESt Berlin 6,0 % (seit 2014). Notar/Grundbuch & Makler: marktübliche Annahmen.",
  },
  brandenburg: {
    label: "Brandenburg",
    transferTaxRate: 6.5,
    notaryRate: 2.0,
    brokerRate: 3.57,
    source: "GrESt Brandenburg 6,5 % (seit 07/2015). Notar/Grundbuch & Makler: marktübliche Annahmen.",
  },
};

/** Default-Zinsannahme: Effektivzins Wohnungsbaukredite > 10 J. Zinsbindung, Bundesbank MFI-Zinsstatistik 08/2026. */
export const DEFAULT_RATE_ASSUMPTION = {
  value: 4.04,
  label: "Bundesbank MFI-Zinsstatistik, Neugeschäft Wohnungsbaukredite, Zinsbindung > 10 J., August 2026 (effektiv)",
};

export interface PurchaseCosts {
  price: number;
  transferTax: number;
  notary: number;
  broker: number;
  ancillary: number; // Kaufnebenkosten gesamt
  ancillaryPct: number;
  total: number; // Gesamtkosten
}

export function purchaseCosts(price: number, transferTaxRate: number, notaryRate: number, brokerRate: number): PurchaseCosts {
  const transferTax = round2((price * transferTaxRate) / 100);
  const notary = round2((price * notaryRate) / 100);
  const broker = round2((price * brokerRate) / 100);
  const ancillary = round2(transferTax + notary + broker);
  return {
    price,
    transferTax,
    notary,
    broker,
    ancillary,
    ancillaryPct: price > 0 ? (ancillary / price) * 100 : 0,
    total: round2(price + ancillary),
  };
}

export interface EquityLevels {
  minimum: number; // Nebenkosten (übliche Bankanforderung)
  recommended: number; // Nebenkosten + 10 % Kaufpreis
  comfortable: number; // Nebenkosten + 20 % Kaufpreis
  target: number; // Nebenkosten + equityTargetPct
}

export function equityLevels(costs: PurchaseCosts, equityTargetPct: number): EquityLevels {
  return {
    minimum: costs.ancillary,
    recommended: round2(costs.ancillary + costs.price * 0.1),
    comfortable: round2(costs.ancillary + costs.price * 0.2),
    target: round2(costs.ancillary + (costs.price * equityTargetPct) / 100),
  };
}

export interface FinancingResult {
  costs: PurchaseCosts;
  equity: number;
  loan: number;
  monthlyRate: number;
  lendingValue: number; // Beleihungswert
  ltvPct: number; // Beleihungsauslauf
  ltvPurchasePct: number; // Darlehen / Kaufpreis
  remainingAfterFixation: number;
  payoffMonths: number | null;
  totalInterestInFixation: number;
  hoaNonAllocable: number;
  maintenanceMonthly: number;
  monthlyOwnerCost: number; // Rate + nicht umlagef. Hausgeld + Rücklage
  rentMonthly: number; // Kaltmiete nach Mietausfallwagnis (nur Kapitalanlage)
  monthlyNetCashflow: number; // Kapitalanlage: Miete - Kosten (vor Steuern)
  grossYieldPct: number;
  priceFactor: number; // Kaufpreis / Jahreskaltmiete
  warnings: string[];
}

export function financing(plan: PropertyPlan, equity: number): FinancingResult {
  const costs = purchaseCosts(plan.purchasePrice, plan.transferTaxRate, plan.notaryRate, plan.brokerRate);
  const loan = round2(Math.max(0, costs.total - equity));
  const monthlyRate = annuityMonthlyRate(loan, plan.interestRate, plan.repaymentRate);
  const lendingValue = round2(plan.purchasePrice * (1 - plan.lendingValueDiscount / 100));
  const ltvPct = lendingValue > 0 ? (loan / lendingValue) * 100 : 0;
  const fixationMonths = plan.fixationYears * 12;
  const remainingAfterFixation = remainingBalance(loan, plan.interestRate, monthlyRate, fixationMonths);
  const totalPaid = monthlyRate * fixationMonths;
  const totalInterestInFixation = round2(totalPaid - (loan - remainingAfterFixation));
  const hoaNonAllocable = round2((plan.hoaMonthly * plan.hoaNonAllocableShare) / 100);
  const maintenanceMonthly = round2((plan.sizeSqm * plan.maintenancePerSqmYear) / 12);
  const monthlyOwnerCost = round2(monthlyRate + hoaNonAllocable + maintenanceMonthly);
  const grossRent = plan.sizeSqm * plan.expectedColdRentPerSqm;
  const rentMonthly = plan.usage === "rental" ? round2(grossRent * (1 - plan.vacancyRiskPct / 100)) : 0;
  const monthlyNetCashflow = plan.usage === "rental" ? round2(rentMonthly - monthlyOwnerCost) : round2(-monthlyOwnerCost);
  const grossYieldPct = plan.purchasePrice > 0 ? ((grossRent * 12) / plan.purchasePrice) * 100 : 0;
  const priceFactor = grossRent > 0 ? plan.purchasePrice / (grossRent * 12) : 0;

  const warnings: string[] = [];
  if (equity < costs.ancillary)
    warnings.push("Eigenkapital deckt die Kaufnebenkosten nicht – Vollfinanzierungen sind teurer und schwer zu bekommen.");
  if (ltvPct > 100) warnings.push("Beleihungsauslauf über 100 % – deutliche Zinsaufschläge wahrscheinlich.");
  else if (ltvPct > 90) warnings.push("Beleihungsauslauf über 90 % – Zinsaufschlag wahrscheinlich.");
  if (plan.repaymentRate < 2) warnings.push("Anfängliche Tilgung unter 2 % – hohe Restschuld nach Zinsbindung.");
  if (payoffMonths(loan, plan.interestRate, monthlyRate) === null && loan > 0)
    warnings.push("Rate deckt die Zinsen nicht – Kredit würde nie getilgt.");
  return {
    costs,
    equity,
    loan,
    monthlyRate,
    lendingValue,
    ltvPct,
    ltvPurchasePct: plan.purchasePrice > 0 ? (loan / plan.purchasePrice) * 100 : 0,
    remainingAfterFixation,
    payoffMonths: payoffMonths(loan, plan.interestRate, monthlyRate),
    totalInterestInFixation,
    hoaNonAllocable,
    maintenanceMonthly,
    monthlyOwnerCost,
    rentMonthly,
    monthlyNetCashflow,
    grossYieldPct,
    priceFactor,
    warnings,
  };
}

/**
 * Benötigte monatliche Sparrate, um `target` bis in `months` Monaten zu erreichen,
 * ausgehend von `current`, mit Verzinsung `ratePct` p.a. (monatlich).
 */
export function requiredMonthlySaving(target: number, current: number, months: number, ratePct = 0): number {
  if (target <= current) return 0;
  if (months <= 0) return round2(target - current);
  const r = ratePct / 100 / 12;
  if (r === 0) return round2((target - current) / months);
  const f = Math.pow(1 + r, months);
  const fvCurrent = current * f;
  return round2(Math.max(0, (target - fvCurrent) * r / (f - 1)));
}

/** Monate bis Zielbetrag bei gegebener Sparrate (null wenn > 600 Monate). */
export function monthsToTarget(target: number, current: number, monthly: number, ratePct = 0): number | null {
  if (current >= target) return 0;
  const r = ratePct / 100 / 12;
  let bal = current;
  for (let m = 1; m <= 600; m++) {
    bal = bal * (1 + r) + monthly;
    if (bal >= target) return m;
  }
  return null;
}

export const SCENARIO_PRICES = [100_000, 150_000, 200_000, 250_000];

export interface ScenarioRow {
  price: number;
  region: "berlin" | "brandenburg";
  costs: PurchaseCosts;
  equityMin: number;
  equityRecommended: number;
  loanAtRecommended: number;
  monthlyRateAtRecommended: number;
  ownerCostAtRecommended: number;
  burdenPct: number | null; // Belastungsquote ggü. Netto-Einkommen
  monthlySavingNeeded: number; // bis Zieldatum für "empfohlen"
}

export function priceScenarios(
  base: PropertyPlan,
  currentEquity: number,
  monthsUntilTarget: number,
  netIncome: number,
  safeRatePct: number,
): ScenarioRow[] {
  const rows: ScenarioRow[] = [];
  for (const region of ["berlin", "brandenburg"] as const) {
    const d = REGION_DEFAULTS[region];
    for (const price of SCENARIO_PRICES) {
      const plan: PropertyPlan = {
        ...base,
        purchasePrice: price,
        region,
        transferTaxRate: d.transferTaxRate,
        notaryRate: base.notaryRate,
        brokerRate: base.brokerRate,
        // Größe proportional skalieren für Hausgeld/Rücklage-Annahmen
      };
      const costs = purchaseCosts(price, d.transferTaxRate, base.notaryRate, base.brokerRate);
      const levels = equityLevels(costs, 10);
      const f = financing(plan, levels.recommended);
      rows.push({
        price,
        region,
        costs,
        equityMin: levels.minimum,
        equityRecommended: levels.recommended,
        loanAtRecommended: f.loan,
        monthlyRateAtRecommended: f.monthlyRate,
        ownerCostAtRecommended: f.monthlyOwnerCost,
        burdenPct: netIncome > 0 ? (f.monthlyOwnerCost / netIncome) * 100 : null,
        monthlySavingNeeded: requiredMonthlySaving(levels.recommended, currentEquity, monthsUntilTarget, safeRatePct),
      });
    }
  }
  return rows;
}

/** Sensitivität: Monatsrate bei verschiedenen Zinssätzen. */
export function rateSensitivity(loan: number, repaymentPct: number, rates: number[]) {
  return rates.map((rate) => ({ rate, monthlyRate: annuityMonthlyRate(loan, rate, repaymentPct) }));
}
