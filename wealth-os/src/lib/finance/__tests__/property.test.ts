import { describe, expect, it } from "vitest";
import { annuityMonthlyRate, amortizationSchedule, payoffMonths, remainingBalance } from "../loan";
import { equityLevels, financing, monthsToTarget, priceScenarios, purchaseCosts, requiredMonthlySaving } from "../property";
import { defaultProperty } from "../../seed";

describe("Darlehen", () => {
  it("Annuität: 200.000 € × (4 % + 2 %) / 12 = 1.000 €", () => {
    expect(annuityMonthlyRate(200_000, 4, 2)).toBe(1000);
  });
  it("Restschuld nach 10 Jahren entspricht Tilgungsplan", () => {
    const rest = remainingBalance(200_000, 4, 1000, 120);
    const plan = amortizationSchedule(200_000, 4, 1000, 120);
    expect(plan.at(-1)!.balance).toBeCloseTo(rest, 0);
    // Referenz (Annuitätenformel): ~150.917 €
    expect(rest).toBeGreaterThan(150_900);
    expect(rest).toBeLessThan(150_930);
  });
  it("erster Monat: Zins 666,67 €, Tilgung 333,33 €", () => {
    const [first] = amortizationSchedule(200_000, 4, 1000, 1);
    expect(first.interest).toBeCloseTo(666.67, 2);
    expect(first.principal).toBeCloseTo(333.33, 2);
  });
  it("Rate deckt Zinsen nicht → nie getilgt", () => {
    expect(payoffMonths(100_000, 6, 400)).toBeNull();
  });
  it("Laufzeit ohne Zins = Darlehen / Rate", () => {
    expect(payoffMonths(805, 0, 161)).toBe(5);
  });
});

describe("Kaufnebenkosten Berlin vs. Brandenburg", () => {
  it("Berlin 200.000 €: GrESt 12.000, Notar 4.000, Makler 7.140", () => {
    const c = purchaseCosts(200_000, 6.0, 2.0, 3.57);
    expect(c.transferTax).toBe(12_000);
    expect(c.notary).toBe(4_000);
    expect(c.broker).toBe(7_140);
    expect(c.ancillary).toBe(23_140);
    expect(c.total).toBe(223_140);
  });
  it("Brandenburg 200.000 €: GrESt 13.000", () => {
    expect(purchaseCosts(200_000, 6.5, 2.0, 3.57).transferTax).toBe(13_000);
  });
  it("Eigenkapitalstufen", () => {
    const l = equityLevels(purchaseCosts(200_000, 6.0, 2.0, 3.57), 10);
    expect(l.minimum).toBe(23_140);
    expect(l.recommended).toBe(43_140);
    expect(l.comfortable).toBe(63_140);
    expect(l.target).toBe(43_140);
  });
});

describe("Finanzierung", () => {
  const plan = { ...defaultProperty(new Date(2026, 10, 16)), purchasePrice: 200_000, interestRate: 4, repaymentRate: 2, transferTaxRate: 6, notaryRate: 2, brokerRate: 3.57 };
  it("Darlehen = Gesamtkosten − Eigenkapital; Beleihungsauslauf ggü. Beleihungswert (−10 %)", () => {
    const f = financing(plan, 43_140);
    expect(f.loan).toBe(180_000);
    expect(f.monthlyRate).toBe(900);
    expect(f.lendingValue).toBe(180_000);
    expect(f.ltvPct).toBeCloseTo(100, 6);
    expect(f.warnings.some((w) => w.includes("Kaufnebenkosten"))).toBe(false);
  });
  it("warnt, wenn Eigenkapital die Nebenkosten nicht deckt", () => {
    expect(financing(plan, 10_000).warnings.some((w) => w.includes("Kaufnebenkosten"))).toBe(true);
  });
  it("Kapitalanlage: Cashflow = Miete nach Ausfallwagnis − Kosten", () => {
    const f = financing({ ...plan, usage: "rental", sizeSqm: 50, expectedColdRentPerSqm: 14, vacancyRiskPct: 0 }, 43_140);
    expect(f.rentMonthly).toBe(700);
    expect(f.monthlyNetCashflow).toBeCloseTo(700 - f.monthlyOwnerCost, 2);
    expect(f.grossYieldPct).toBeCloseTo((700 * 12 / 200_000) * 100, 6);
  });
});

describe("Sparziel-Rechner", () => {
  it("ohne Zins linear", () => {
    expect(requiredMonthlySaving(12_000, 0, 24, 0)).toBe(500);
  });
  it("mit Zins weniger nötig", () => {
    expect(requiredMonthlySaving(12_000, 0, 24, 2)).toBeLessThan(500);
  });
  it("Ziel erreicht → 0", () => {
    expect(requiredMonthlySaving(1000, 2000, 12)).toBe(0);
  });
  it("Monate bis Ziel", () => {
    expect(monthsToTarget(1000, 0, 100, 0)).toBe(10);
  });
  it("8 Preisszenarien (4 Preise × Berlin/Brandenburg)", () => {
    const rows = priceScenarios(defaultProperty(new Date(2026, 10, 16)), 0, 40, 1400, 2);
    expect(rows).toHaveLength(8);
    const bb = rows.find((r) => r.region === "brandenburg" && r.price === 100_000)!;
    expect(bb.costs.transferTax).toBe(6_500);
  });
});
