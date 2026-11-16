import { describe, expect, it } from "vitest";
import { initialData, GOAL_IDS } from "../../seed";
import { accountBalance, debtBalance, dueAutoBookings, goalBalance, goalStats, monthSummary, planForMonth, upcomingChanges, wealth } from "../finance";
import type { Expense, FinanceData, Movement } from "../../types";

const NOW = new Date(2026, 10, 16, 12); // 16.11.2026
const fresh = () => initialData(NOW);
let n = 0;
const exp = (amount: number, category: Expense["category"], date = "2026-11-10"): Expense => ({ id: `e${n++}`, amount, category, date, createdAt: `2026-11-16T13:00:0${n % 10}.000Z` });
const mv = (p: Partial<Movement> & Pick<Movement, "kind" | "amount" | "goalId">): Movement => ({ id: `m${n++}`, date: "2026-11-16", createdAt: "2026-11-16T13:00:00.000Z", ...p });

describe("Ausgangsdaten (keine erfundenen Werte)", () => {
  const d = fresh();
  it("keine Ausgaben, keine Sparbewegungen, alle Guthaben 0 €", () => {
    expect(d.expenses).toHaveLength(0);
    expect(d.movements).toHaveLength(0);
    expect(d.accounts.every((a) => a.balance === 0)).toBe(true);
    expect(d.goals.every((g) => g.startAmount === 0)).toBe(true);
  });
  it("5 voreingestellte Sparziele", () => {
    expect(d.goals.map((g) => g.type)).toEqual(["property", "travel", "emergency", "investment", "custom"]);
  });
  it("Kredit-Restschuld (geschätzt) = 4 offene Raten (Dez–Mär) × 161 €", () => {
    expect(d.debts[0].balance).toBe(644);
    expect(d.debts[0].isEstimate).toBe(true);
  });
});

describe("Monatsplan & Kreditende", () => {
  const d = fresh();
  it("November 2026: Fixkosten 432 €, Sparplan 150 €, frei 418 €", () => {
    const p = planForMonth(d, "2026-11");
    expect(p.income).toBe(1400);
    expect(p.fixed).toBe(432);
    expect(p.savingsPlans).toBe(150);
    expect(p.free).toBe(418);
  });
  it("März 2027 noch mit Kredit", () => expect(planForMonth(d, "2027-03").fixed).toBe(432));
  it("ab April 2027 entfällt die Kreditrate automatisch → 271 € Fixkosten, 579 € frei", () => {
    const p = planForMonth(d, "2027-04");
    expect(p.fixed).toBe(271);
    expect(p.free).toBe(579);
  });
  it("Hinweis auf kommende Änderung", () => {
    const c = upcomingChanges(d, NOW);
    expect(c[0]).toMatchObject({ month: "2027-04", delta: 161 });
  });
  it("Einkommen und Fixkosten sind veränderbar", () => {
    const changed: FinanceData = { ...d, plan: d.plan.map((p) => (p.id === "plan_income" ? { ...p, amount: 1600 } : p.id === "plan_phone" ? { ...p, amount: 30 } : p)) };
    expect(planForMonth(changed, "2026-11").free).toBe(418 + 200 + 15);
  });
});

describe("Ausgaben & Budget", () => {
  it("Ausgaben reduzieren persönliches Budget bzw. Reisebudget und das verfügbare Geld", () => {
    const d = { ...fresh(), expenses: [exp(23.5, "Lebensmittel"), exp(40, "Freizeit"), exp(120, "Reisen"), exp(15, "Lebensmittel", "2026-10-30")] };
    const s = monthSummary(d, "2026-11");
    expect(s.variable).toBe(183.5);
    expect(s.personalSpent).toBe(63.5);
    expect(s.personalLeft).toBe(136.5);
    expect(s.travelLeft).toBe(80);
    expect(s.byCategory.Lebensmittel).toBe(23.5);
    expect(s.remaining).toBe(1400 - 432 - 183.5);
    expect(s.expenseCount).toBe(3); // Oktober-Ausgabe zählt nicht
  });
  it("Budgetüberschreitung → negativer Rest", () => {
    const s = monthSummary({ ...fresh(), expenses: [exp(250, "Kleidung")] }, "2026-11");
    expect(s.personalLeft).toBe(-50);
  });
});

describe("Sparen: keine Doppelzählung", () => {
  const base = () => {
    const d = fresh();
    d.accounts[0] = { ...d.accounts[0], balance: 2000, balanceSetAt: "2026-11-16T12:00:00.000Z" };
    return d;
  };
  it("100 € fürs Immobilienziel: Ziel +100, Bank −100, Nettovermögen unverändert, keine Ausgabe", () => {
    const d = base();
    const before = wealth(d, NOW);
    d.movements = [mv({ kind: "deposit", amount: 100, goalId: GOAL_IDS.property })];
    const after = wealth(d, NOW);
    expect(goalBalance(d.goals[0], d.movements)).toBe(100);
    expect(accountBalance(d.accounts[0], d.movements)).toBe(1900);
    expect(after.netWorth).toBe(before.netWorth);
    expect(after.groups.Immobilienrücklagen).toBe(100);
    const s = monthSummary(d, "2026-11");
    expect(s.variable).toBe(0);
    expect(s.saved).toBe(100);
    expect(s.remaining).toBe(1400 - 432 - 100);
    expect(s.savingsRate).toBeCloseTo(100 / 1400);
  });
  it("Umschichtung zwischen Zielen ändert weder Gespartes noch Vermögen", () => {
    const d = base();
    d.movements = [mv({ kind: "deposit", amount: 500, goalId: GOAL_IDS.emergency }), mv({ kind: "transfer", amount: 200, goalId: GOAL_IDS.property, fromGoalId: GOAL_IDS.emergency })];
    expect(goalBalance(d.goals[2], d.movements)).toBe(300);
    expect(goalBalance(d.goals[0], d.movements)).toBe(200);
    expect(monthSummary(d, "2026-11").saved).toBe(500);
    expect(wealth(d, NOW).netWorth).toBe(2000 - 644);
  });
  it("Entnahme fließt zurück aufs Bankkonto", () => {
    const d = base();
    d.movements = [mv({ kind: "deposit", amount: 300, goalId: GOAL_IDS.travel }), mv({ kind: "withdrawal", amount: 120, goalId: GOAL_IDS.travel })];
    expect(goalBalance(d.goals[1], d.movements)).toBe(180);
    expect(accountBalance(d.accounts[0], d.movements)).toBe(1820);
    expect(monthSummary(d, "2026-11").saved).toBe(180);
  });
  it("Wertänderung (z. B. Kursgewinn) erhöht das Vermögen, zählt aber nicht als gespart", () => {
    const d = base();
    d.movements = [mv({ kind: "valuation", amount: 42, goalId: GOAL_IDS.investment })];
    expect(wealth(d, NOW).netWorth).toBe(2000 + 42 - 644);
    expect(monthSummary(d, "2026-11").saved).toBe(0);
  });
  it("Sparbewegungen VOR dem eingetragenen Kontostand werden nicht nochmals abgezogen", () => {
    const d = base();
    d.movements = [mv({ kind: "deposit", amount: 100, goalId: GOAL_IDS.property, createdAt: "2026-11-15T09:00:00.000Z" })];
    expect(accountBalance(d.accounts[0], d.movements)).toBe(2000);
  });
});

describe("Sparziel-Prognose", () => {
  it("Fehlbetrag, Prozent und Zeitpunkt (30.000 € bei 418 €/Monat)", () => {
    const d = fresh();
    d.movements = [mv({ kind: "deposit", amount: 3000, goalId: GOAL_IDS.property })];
    const s = goalStats(d.goals[0], d, NOW);
    expect(s.current).toBe(3000);
    expect(s.missing).toBe(27000);
    expect(s.progress).toBe(10);
    expect(s.monthsLeft).toBe(Math.ceil(27000 / 418)); // 65
    expect(s.etaMonth).toBe("2032-04");
  });
  it("Sparplan zählt zur Rate des Investment-Ziels", () => {
    const d = fresh();
    expect(goalStats(d.goals[3], d, NOW).monthlyRate).toBe(150);
  });
  it("ohne Plan: Ø der letzten 3 Monate, sonst keine Prognose", () => {
    const d = fresh();
    expect(goalStats(d.goals[2], d, NOW).etaMonth).toBeNull();
    d.movements = [mv({ kind: "deposit", amount: 300, goalId: GOAL_IDS.emergency, date: "2026-10-05" })];
    const s = goalStats(d.goals[2], d, NOW);
    expect(s.rateSource).toBe("average");
    expect(s.monthlyRate).toBe(100);
  });
  it("Ziel erreicht → 0 Monate", () => {
    const d = fresh();
    d.goals[4] = { ...d.goals[4], startAmount: 1000 };
    expect(goalStats(d.goals[4], d, NOW)).toMatchObject({ missing: 0, monthsLeft: 0, progress: 100 });
  });
});

describe("Sparplan-Automatik (Trade Republic)", () => {
  it("bucht nichts rückwirkend im Startmonat", () => {
    expect(dueAutoBookings(fresh(), NOW)).toHaveLength(0);
  });
  it("bucht ab Dezember am 2. jeden Monat, idempotent, gelöschte bleiben gelöscht", () => {
    const d = fresh();
    const jan3 = new Date(2027, 0, 3, 12);
    const due = dueAutoBookings(d, jan3);
    expect(due.map((m) => m.id)).toEqual(["auto_plan_tr_2026-12", "auto_plan_tr_2027-01"]);
    expect(due[0]).toMatchObject({ kind: "deposit", amount: 150, goalId: GOAL_IDS.investment, date: "2026-12-02" });
    d.movements = [due[0]];
    d.settings.skippedAuto = ["auto_plan_tr_2027-01"];
    expect(dueAutoBookings(d, jan3)).toHaveLength(0);
    expect(dueAutoBookings(fresh(), new Date(2026, 11, 1, 12))).toHaveLength(0); // vor dem 2.
  });
});

describe("Kredit & Vermögen", () => {
  const d = fresh().debts[0];
  it("Restschuld sinkt monatlich und ist ab April 2027 null", () => {
    expect(debtBalance(d, NOW)).toBe(644);
    expect(debtBalance(d, new Date(2026, 11, 1, 12))).toBe(483);
    expect(debtBalance(d, new Date(2027, 2, 15))).toBe(0);
    expect(debtBalance(d, new Date(2028, 0, 1))).toBe(0);
  });
  it("Nettovermögen = Vermögen − Verbindlichkeiten", () => {
    const w = wealth(fresh(), NOW);
    expect(w.assets).toBe(0);
    expect(w.netWorth).toBe(-644);
  });
});
