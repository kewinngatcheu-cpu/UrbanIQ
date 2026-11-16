import { describe, expect, it } from "vitest";
import { baselineData } from "../../seed";
import { actualsForMonth, budgetAlerts, compareBudget, planForMonth, recurringAmountForMonth } from "../plan";
import type { RecurringItem, Transaction } from "../../types";

const now = new Date(2026, 10, 16); // 16.11.2026
const data = baselineData(now);

describe("Monatsplan (Briefing-Werte)", () => {
  it("berechnet Fixkosten, Budgets und Überschuss für November 2026", () => {
    const p = planForMonth(data, "2026-11");
    expect(p.income).toBe(1400);
    // 161 + 28 + 45 + 150 + 22 + 7 + 9 + 10
    expect(p.fixedCosts).toBe(432);
    expect(p.variableBudget).toBe(400); // 200 persönlich + 200 Reisen
    expect(p.investments).toBe(150);
    expect(p.surplus).toBe(418); // 1400 - 432 - 400 - 150
    expect(p.plannedSavings).toBe(568);
    expect(p.savingsRate).toBeCloseTo(568 / 1400, 6);
  });

  it("Kredit läuft bis einschließlich März 2027", () => {
    expect(planForMonth(data, "2027-03").fixedCosts).toBe(432);
    expect(planForMonth(data, "2027-03").surplus).toBe(418);
  });

  it("ab April 2027 entfällt die Kreditrate automatisch (+161 € Überschuss)", () => {
    const p = planForMonth(data, "2027-04");
    expect(p.fixedCosts).toBe(271);
    expect(p.surplus).toBe(579);
    expect(p.byCategory.Kredite).toBe(0);
  });

  it("Handyvertrag endet nach 24 Monaten (Oktober 2028)", () => {
    expect(planForMonth(data, "2028-10").byCategory.Abonnements).toBe(45 + 22 + 7 + 9 + 10);
    expect(planForMonth(data, "2028-11").byCategory.Abonnements).toBe(22 + 7 + 9 + 10);
  });
});

describe("Intervalle", () => {
  const base: RecurringItem = { id: "x", name: "x", amount: 120, kind: "expense", category: "Versicherungen", interval: "yearly", dayOfMonth: 1, startMonth: "2026-03" };
  it("jährlich nur im Startmonat jedes Jahres", () => {
    expect(recurringAmountForMonth(base, "2026-03")).toBe(120);
    expect(recurringAmountForMonth(base, "2026-04")).toBe(0);
    expect(recurringAmountForMonth(base, "2027-03")).toBe(120);
    expect(recurringAmountForMonth(base, "2026-02")).toBe(0);
  });
  it("quartalsweise alle 3 Monate", () => {
    const q = { ...base, interval: "quarterly" as const };
    expect(["2026-03", "2026-04", "2026-05", "2026-06"].map((m) => recurringAmountForMonth(q, m))).toEqual([120, 0, 0, 120]);
  });
});

describe("Soll-Ist & Warnungen", () => {
  const tx = (amount: number, category: Transaction["category"], type: Transaction["type"] = "expense"): Transaction => ({ id: Math.random().toString(), date: "2026-11-10", amount, type, category, description: "t", source: "manual" });
  const txs = [tx(1400, "Einkommen", "income"), tx(90, "Lebensmittel"), tx(45, "Freizeit"), tx(30, "Kleidung"), tx(60, "Transport"), tx(150, "Investments"), tx(25, "Wohnen")];
  const plan = planForMonth(data, "2026-11");
  const act = actualsForMonth(txs, "2026-11");

  it("Sparquote Ist = (Einnahmen − Konsum)/Einnahmen; Sparen/Investments sind kein Konsum", () => {
    expect(act.spending).toBe(90 + 45 + 30 + 60 + 25);
    expect(act.savingsTransfers).toBe(150);
    expect(act.savingsRate).toBeCloseTo((1400 - 250) / 1400, 6);
  });

  it("markiert Überschreitung, Warnung und ungeplante Ausgaben", () => {
    const c = Object.fromEntries(compareBudget(plan, act, 80).map((x) => [x.category, x]));
    expect(c.Lebensmittel.status).toBe("over"); // 90 > 70
    expect(c.Freizeit.status).toBe("warning"); // 45/50 = 90 %
    expect(c.Kleidung.status).toBe("warning"); // 30/30 = 100 % (nicht über)
    expect(c.Transport.status).toBe("over");
    expect(c.Wohnen.status).toBe("unplanned");
    expect(c.Investments.status).toBe("ok");
  });

  it("persönliches Limit 200 € wird geprüft", () => {
    const alerts = budgetAlerts(compareBudget(plan, act, 80), data.settings.personalCategories, 200);
    expect(alerts[0].category).toBe("Persönliches Budget"); // 90+45+30+60 = 225 > 200
  });

  it("Monat ohne Buchungen → keine Sparquote (nicht erfunden)", () => {
    const empty = actualsForMonth([], "2026-11");
    expect(empty.hasData).toBe(false);
    expect(empty.savingsRate).toBeNull();
  });
});
