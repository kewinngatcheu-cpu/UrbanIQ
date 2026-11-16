import { describe, expect, it } from "vitest";
import { baselineData, demoData } from "../../seed";
import { project, scenarioPresets } from "../projection";
import { wealthSummary, emergencyFund, wealthHistory } from "../wealth";
import { buildMonthReport, generateInsights, answerQuestion, QUESTIONS, openBills, buildFactSheet } from "../analyst";

const now = new Date(2026, 10, 16);

describe("Prognose", () => {
  const data = baselineData(now);
  const sc = scenarioPresets(0, 0);
  const flat = { ...sc.realistic, investReturnPct: 0, safeRatePct: 0, incomeGrowthPct: 0, inflationPct: 0 };

  it("ohne Zins/Rendite: Eigenkapital wächst exakt um den Überschuss inkl. Kreditwegfall", () => {
    const p = project(data, "2026-11", 12, flat);
    // Dez 26 – Mär 27: 4 × 418; Apr – Nov 27: 8 × 579
    expect(p[12].property).toBe(4 * 418 + 8 * 579);
    expect(p[12].invested).toBe(12 * 150);
    expect(p[12].investedContributions).toBe(1800);
  });

  it("Kredit wird bis März 2027 getilgt", () => {
    const p = project(data, "2026-11", 6, flat);
    expect(p.find((x) => x.month === "2027-03")!.debt).toBe(0);
  });

  it("Szenarien sind geordnet: konservativ ≤ realistisch ≤ ambitioniert", () => {
    const s = scenarioPresets(2, 2);
    const end = (k: keyof typeof s) => project(data, "2026-11", 60, s[k]).at(-1)!.netWorth;
    expect(end("conservative")).toBeLessThan(end("realistic"));
    expect(end("realistic")).toBeLessThan(end("ambitious"));
  });

  it("Simulator: höheres Einkommen erhöht Eigenkapital", () => {
    const a = project(data, "2026-11", 24, flat).at(-1)!.property;
    const b = project(data, "2026-11", 24, flat, { netIncome: 1600 }).at(-1)!.property;
    expect(b - a).toBe(24 * 200);
  });

  it("Berufseinstieg wird ab Monat X berücksichtigt", () => {
    const p = project(data, "2026-11", 24, flat, { careerStart: { month: "2028-01", netIncome: 2400 } });
    expect(p.find((x) => x.month === "2028-01")!.income).toBe(2400);
    expect(p.find((x) => x.month === "2027-12")!.income).toBe(1400);
  });
});

describe("Vermögen & Analyst", () => {
  const demo = demoData(now);
  it("Nettovermögen = Vermögen − Schulden; Rendite = Wert − Einzahlungen", () => {
    const s = wealthSummary(demo);
    expect(s.netWorth).toBeCloseTo(s.totalAssets - s.debts, 2);
    expect(s.returnsInvested).toBeCloseTo(s.invested - s.contributionsInvested, 2);
    expect(s.debts).toBe(644); // Dez–Mär: 4 Restraten à 161 €
  });
  it("Historie nur aus vorhandenen Snapshots (12 Monate Demo)", () => {
    const months = Array.from({ length: 13 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`);
    expect(wealthHistory(baselineData(now), months)).toHaveLength(0);
  });
  it("Notgroschen-Rechner", () => {
    const e = emergencyFund(900, 3, 1800);
    expect(e.target).toBe(2700);
    expect(e.gap).toBe(900);
    expect(e.coverageMonths).toBe(2);
  });
  it("Monatsbericht markiert fehlende Daten statt sie zu erfinden", () => {
    const r = buildMonthReport(baselineData(now), "2026-11");
    expect(r.actualSpending).toBeNull();
    expect(r.missing.length).toBeGreaterThan(0);
  });
  it("Offene Rechnungen = fällige Posten ohne Buchung", () => {
    const bills = openBills(baselineData(now), "2026-11");
    expect(bills.map((b) => b.name)).toContain("Kreditrate");
  });
  it("Insights und alle Fragen liefern Antworten", () => {
    expect(generateInsights(demo, now).length).toBeGreaterThan(3);
    for (const q of QUESTIONS) expect(answerQuestion(q, demo, now).answer.length).toBeGreaterThan(0);
  });
  it("Faktenblatt enthält keine Einzeltransaktionen", () => {
    const f = JSON.stringify(buildFactSheet(demo, now));
    expect(f).not.toContain("REWE");
    expect(f).toContain("isDemoData");
  });
});
