/**
 * Financial Intelligence – regelbasierter Analyst.
 * Grundsatz: Es werden nur gespeicherte Daten ausgewertet. Fehlt etwas, wird es als fehlend markiert.
 */
import type { ExpenseCategory, FinanceData, Month, MonthReport } from "../types";
import { CATEGORIES } from "../types";
import { addMonths, monthLabel, toMonth } from "./months";
import { actualsForMonth, budgetAlerts, compareBudget, planForMonth } from "./plan";
import { wealthHistory, wealthSummary } from "./wealth";
import { goalProgress } from "./goals";
import { equityLevels, financing, monthsToTarget, purchaseCosts, requiredMonthlySaving } from "./property";
import { project, scenarioPresets } from "./projection";
import { fmtEUR, fmtPct, round2 } from "../format";
import { recurringAmountForMonth } from "./plan";

export type InsightSeverity = "positive" | "info" | "warning" | "critical";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  action?: string;
}

export function openBills(data: FinanceData, month: Month) {
  return data.recurring
    .filter((r) => r.kind !== "income")
    .map((r) => ({ r, amount: recurringAmountForMonth(r, month) }))
    .filter(({ amount }) => amount > 0)
    .filter(({ r }) => !data.transactions.some((t) => t.recurringId === r.id && t.date.startsWith(month)))
    .map(({ r, amount }) => ({ id: r.id, name: r.name, amount, dueDay: r.dayOfMonth, category: r.category }));
}

/** Der Immobilien-Zielbetrag (Eigenkapital) aus Plan. */
export function propertyEquityTarget(data: FinanceData): number {
  const p = data.property;
  const costs = purchaseCosts(p.purchasePrice, p.transferTaxRate, p.notaryRate, p.brokerRate);
  return equityLevels(costs, p.equityTargetPct).target;
}

export function propertyStatus(data: FinanceData, now: Date = new Date()) {
  const month = toMonth(now);
  const summary = wealthSummary(data);
  const equity = data.property.equity ?? summary.property;
  const target = propertyEquityTarget(data);
  const monthsLeft = Math.max(0, (Number(data.property.targetDate.slice(0, 4)) - now.getFullYear()) * 12 + Number(data.property.targetDate.slice(5, 7)) - (now.getMonth() + 1));
  const plan = planForMonth(data, month);
  const required = requiredMonthlySaving(target, equity, monthsLeft, data.settings.safeInterestPct);
  const projected = project(data, month, Math.max(monthsLeft, 1), scenarioPresets(data.settings.salaryGrowthPct, data.settings.safeInterestPct).realistic);
  const projectedAtTarget = projected[Math.min(monthsLeft, projected.length - 1)].property;
  const etaMonths = monthsToTarget(target, equity, Math.max(0, plan.surplus), data.settings.safeInterestPct);
  return {
    equity,
    target,
    progressPct: target > 0 ? Math.min(100, (equity / target) * 100) : 0,
    monthsLeft,
    requiredMonthly: required,
    currentMonthly: Math.max(0, plan.surplus),
    projectedAtTarget,
    onTrack: projectedAtTarget >= target,
    etaMonth: etaMonths !== null ? addMonths(month, etaMonths) : null,
    financing: financing(data.property, equity),
  };
}

export function generateInsights(data: FinanceData, now: Date = new Date()): Insight[] {
  const month = toMonth(now);
  const prev = addMonths(month, -1);
  const out: Insight[] = [];
  const plan = planForMonth(data, month);
  const act = actualsForMonth(data.transactions, month);
  const prevAct = actualsForMonth(data.transactions, prev);
  const summary = wealthSummary(data);

  // 1. Datenlage
  if (!act.hasData)
    out.push({ id: "no-tx", severity: "info", title: `Keine Buchungen für ${monthLabel(month, true)}`, detail: "Ohne erfasste Transaktionen kann der Ist-Zustand nicht bewertet werden. Werte unten basieren nur auf deiner Planung.", action: "Transaktionen erfassen oder CSV importieren." });

  // 2. Budgetwarnungen
  const comps = compareBudget(plan, act, data.settings.warnThresholdPct);
  for (const a of budgetAlerts(comps, data.settings.personalCategories, data.settings.personalBudgetCap)) {
    out.push({ id: `budget-${a.category}`, severity: a.severity === "over" ? "critical" : "warning", title: a.message, detail: "Grundlage: Soll-Ist-Vergleich des laufenden Monats." });
  }

  // 3. Gestiegene Ausgaben ggü. Vormonat
  if (act.hasData && prevAct.hasData) {
    const rising = CATEGORIES.filter((c) => !["Investments", "Sparen"].includes(c))
      .map((c) => ({ c, now: act.byCategory[c], before: prevAct.byCategory[c] }))
      .filter((x) => x.now - x.before > 20 && x.now > x.before * 1.2)
      .sort((a, b) => b.now - b.before - (a.now - a.before))
      .slice(0, 3);
    for (const r of rising)
      out.push({ id: `rise-${r.c}`, severity: "warning", title: `${r.c}: +${fmtEUR(r.now - r.before)} ggü. Vormonat`, detail: `${fmtEUR(r.before)} → ${fmtEUR(r.now)}.` });
  }

  // 4. Sparquote
  if (act.savingsRate !== null) {
    const sev: InsightSeverity = act.savingsRate >= 0.3 ? "positive" : act.savingsRate >= 0.15 ? "info" : "warning";
    out.push({ id: "rate", severity: sev, title: `Sparquote ${fmtPct(act.savingsRate * 100)} (Ist)`, detail: `Geplant: ${fmtPct(plan.savingsRate * 100)}. Einnahmen ${fmtEUR(act.income)}, Konsumausgaben ${fmtEUR(act.spending)}.` });
  }

  // 5. Abos
  const subs = data.recurring.filter((r) => r.isSubscription && recurringAmountForMonth(r, month) > 0);
  const subTotal = subs.reduce((s, r) => s + r.amount, 0);
  if (subTotal > 0)
    out.push({ id: "subs", severity: subTotal > 50 ? "warning" : "info", title: `Abonnements: ${fmtEUR(subTotal)}/Monat (${fmtEUR(subTotal * 12)}/Jahr)`, detail: subs.map((s) => `${s.name} ${fmtEUR(s.amount)}`).join(" · "), action: "Prüfe, welche Abos du im letzten Monat wirklich genutzt hast." });

  // 6. Kreditende
  const loans = data.recurring.filter((r) => r.category === "Kredite" && r.endMonth && r.endMonth >= month);
  for (const l of loans) {
    const freed = l.amount;
    out.push({ id: `loan-${l.id}`, severity: "positive", title: `${l.name} endet ${monthLabel(l.endMonth!, true)}`, detail: `Ab ${monthLabel(addMonths(l.endMonth!, 1), true)} werden ${fmtEUR(freed)}/Monat frei.`, action: `Leite die ${fmtEUR(freed)} direkt per Dauerauftrag ins Immobilien-Eigenkapital um, statt sie im Konsum versickern zu lassen.` });
  }

  // 7. Notgroschen
  const essentials = plan.fixedCosts + (plan.byCategory.Lebensmittel ?? 0);
  const efTarget = essentials * data.settings.emergencyFundMonths;
  const efAccounts = data.accounts.filter((a) => a.type === "emergency" || a.type === "savings");
  const ef = efAccounts.reduce((s, a) => s + a.balance, 0);
  if (efAccounts.length === 0)
    out.push({ id: "ef-missing", severity: "warning", title: "Kein Notgroschen-Konto erfasst", detail: "Fehlende Daten: Lege ein Tagesgeld-/Notgroschen-Konto an.", action: "Konto unter Vermögen anlegen." });
  else if (ef < efTarget)
    out.push({ id: "ef", severity: "warning", title: `Notgroschen bei ${fmtEUR(ef)} von ${fmtEUR(efTarget)}`, detail: `Ziel: ${data.settings.emergencyFundMonths} Monate essenzielle Kosten (${fmtEUR(essentials)}/Monat).`, action: "Notgroschen vor zusätzlichen Investments auffüllen." });
  else out.push({ id: "ef-ok", severity: "positive", title: "Notgroschen vollständig", detail: `${fmtEUR(ef)} ≥ Ziel ${fmtEUR(efTarget)}.` });

  // 8. Immobilienziel
  const ps = propertyStatus(data, now);
  out.push({
    id: "property",
    severity: ps.onTrack ? "positive" : "warning",
    title: ps.onTrack ? "Immobilienziel: auf Kurs (realistisches Szenario)" : "Immobilienziel: nicht auf Kurs",
    detail: `Eigenkapital ${fmtEUR(ps.equity)} von ${fmtEUR(ps.target)}. Benötigt: ${fmtEUR(ps.requiredMonthly)}/Monat, aktuell geplant: ${fmtEUR(ps.currentMonthly)}/Monat. Prognose zum Zieldatum: ${fmtEUR(ps.projectedAtTarget)}.`,
    action: ps.onTrack ? undefined : `Erhöhe die Sparrate um ${fmtEUR(Math.max(0, ps.requiredMonthly - ps.currentMonthly))}/Monat oder passe Kaufpreis/Zieldatum an.`,
  });

  // 9. Belastungsquote
  const burden = plan.income > 0 ? ps.financing.monthlyOwnerCost / plan.income : null;
  if (burden !== null && burden > 0.4)
    out.push({ id: "burden", severity: "critical", title: `Kreditbelastung ${fmtPct(burden * 100)} des aktuellen Nettoeinkommens`, detail: `Monatliche Kosten der Wunschimmobilie (${fmtEUR(ps.financing.monthlyOwnerCost)}) wären mit dem heutigen Einkommen kaum tragbar. Banken rechnen meist mit max. 35–40 %.`, action: "Kaufpreis senken, mehr Eigenkapital ansparen oder Kauf erst nach Einkommenssteigerung planen." });

  // 10. Schulden
  if (summary.debts > 0)
    out.push({ id: "debts", severity: "info", title: `Schulden: ${fmtEUR(summary.debts)}`, detail: data.debts.map((d) => `${d.name}: ${fmtEUR(d.balance)}${d.balanceIsEstimate ? " (geschätzt)" : ""}`).join(" · ") });

  // 11. Kurse veraltet
  const stale = data.holdings.filter((h) => !h.priceDate || (now.getTime() - new Date(h.priceDate).getTime()) / 86_400_000 > 31);
  if (stale.length > 0)
    out.push({ id: "stale", severity: "info", title: `${stale.length} Position(en) mit Kurs älter als 31 Tage`, detail: stale.map((h) => h.name).join(", "), action: "Kurse manuell aktualisieren oder Marktdaten-Integration aktivieren." });

  return out;
}

/** Monatsbericht (auch für Abschluss & PDF). */
export function buildMonthReport(data: FinanceData, month: Month): MonthReport {
  const plan = planForMonth(data, month);
  const act = actualsForMonth(data.transactions, month);
  const comps = compareBudget(plan, act, data.settings.warnThresholdPct);
  const summary = wealthSummary(data);
  const hist = wealthHistory(data, [addMonths(month, -1)]);
  const missing: string[] = [];
  if (!act.hasData) missing.push("Keine Transaktionen für diesen Monat erfasst – Ist-Werte fehlen.");
  if (act.hasData && act.income === 0) missing.push("Keine Einnahmen gebucht – Sparquote (Ist) nicht berechenbar.");
  if (hist.length === 0) missing.push("Kein Vermögens-Snapshot vom Vormonat – Vermögensveränderung nicht berechenbar.");
  if (data.accounts.length === 0) missing.push("Keine Konten erfasst.");
  return {
    month,
    plannedIncome: plan.income,
    actualIncome: act.hasData ? act.income : null,
    plannedSpending: plan.plannedSpending,
    actualSpending: act.hasData ? act.spending : null,
    plannedSavings: plan.plannedSavings,
    actualSavings: act.hasData ? act.netSavings : null,
    plannedSavingsRate: plan.savingsRate,
    actualSavingsRate: act.hasData ? act.savingsRate : null,
    netWorth: summary.netWorth,
    // Veränderung des Bruttovermögens ggü. Vormonats-Snapshot (Schuldenstand des Vormonats ist nicht historisiert)
    netWorthChange: hist.length ? round2(summary.totalAssets - hist[0].total) : null,
    overBudget: comps.filter((c) => c.status === "over" || c.status === "unplanned").map((c) => ({ category: c.category, planned: c.planned, actual: c.actual })),
    openBills: openBills(data, month).map((b) => ({ name: b.name, amount: b.amount, dueDay: b.dueDay })),
    goals: data.goals.map((g) => {
      const p = goalProgress(g, data);
      return { name: g.name, progressPct: p.progressPct, current: p.current, target: g.targetAmount };
    }),
    missing,
  };
}

/** Konkrete Aufgaben für den nächsten Monat – aus Daten abgeleitet. */
export function nextMonthTasks(data: FinanceData, now: Date = new Date()): string[] {
  const tasks: string[] = [];
  const month = toMonth(now);
  const next = addMonths(month, 1);
  const insights = generateInsights(data, now);
  for (const i of insights) if (i.action) tasks.push(i.action);
  const bills = openBills(data, month);
  if (bills.length) tasks.push(`${bills.length} offene Zahlung(en) für ${monthLabel(month)} prüfen und verbuchen.`);
  const ending = data.recurring.filter((r) => r.endMonth === month);
  for (const r of ending) tasks.push(`${r.name} endet diesen Monat – Budget für ${monthLabel(next)} neu verteilen.`);
  tasks.push("Kontostände aktualisieren und Vermögens-Snapshot speichern (Monatsabschluss).");
  return Array.from(new Set(tasks)).slice(0, 8);
}

export interface QAAnswer {
  question: string;
  answer: string;
  basis: string;
  missing?: string;
}

export const QUESTIONS = [
  "Wie viel Geld habe ich diesen Monat ausgegeben?",
  "Welche Ausgaben sind gestiegen?",
  "Wo kann ich Geld einsparen?",
  "Wie hoch ist meine aktuelle Sparquote?",
  "Wie viel Eigenkapital kann ich bis 2029 aufbauen?",
  "Bin ich auf Kurs für meinen Immobilienkauf?",
  "Wie verändert sich mein Vermögen?",
  "Welche finanziellen Entscheidungen sollte ich überdenken?",
] as const;

export function answerQuestion(q: (typeof QUESTIONS)[number], data: FinanceData, now: Date = new Date()): QAAnswer {
  const month = toMonth(now);
  const act = actualsForMonth(data.transactions, month);
  const prevAct = actualsForMonth(data.transactions, addMonths(month, -1));
  const plan = planForMonth(data, month);
  switch (q) {
    case QUESTIONS[0]:
      if (!act.hasData) return { question: q, answer: "Keine Angabe möglich.", basis: "Transaktionen", missing: `Für ${monthLabel(month, true)} sind keine Transaktionen erfasst.` };
      return { question: q, answer: `${fmtEUR(act.spending)} Konsumausgaben (Plan: ${fmtEUR(plan.plannedSpending)}). Zusätzlich ${fmtEUR(act.savingsTransfers)} in Sparen/Investments.`, basis: `${act.count} Transaktionen in ${monthLabel(month, true)}` };
    case QUESTIONS[1]: {
      if (!act.hasData || !prevAct.hasData) return { question: q, answer: "Kein Vergleich möglich.", basis: "Transaktionen", missing: "Es braucht Buchungen im aktuellen und im Vormonat." };
      const diffs = CATEGORIES.map((c) => ({ c, d: act.byCategory[c] - prevAct.byCategory[c] })).filter((x) => x.d > 0 && !["Investments", "Sparen"].includes(x.c)).sort((a, b) => b.d - a.d);
      if (!diffs.length) return { question: q, answer: "Keine Kategorie ist gegenüber dem Vormonat gestiegen.", basis: "Vergleich Vormonat" };
      return { question: q, answer: diffs.slice(0, 5).map((x) => `${x.c} +${fmtEUR(x.d)}`).join(", "), basis: `${monthLabel(addMonths(month, -1))} vs. ${monthLabel(month)}` };
    }
    case QUESTIONS[2]: {
      const ideas: string[] = [];
      const subs = data.recurring.filter((r) => r.isSubscription && recurringAmountForMonth(r, month) > 0).sort((a, b) => b.amount - a.amount);
      if (subs.length) ideas.push(`Abos (${fmtEUR(subs.reduce((s, r) => s + r.amount, 0))}/Monat): ${subs.map((s) => s.name).join(", ")} – überschneiden sich z. B. mehrere KI-Abos?`);
      const comps = compareBudget(plan, act, data.settings.warnThresholdPct).filter((c) => c.status === "over" || c.status === "unplanned");
      for (const c of comps) ideas.push(`${c.category}: ${fmtEUR(c.actual)} ausgegeben bei ${fmtEUR(c.planned)} Budget.`);
      const contracts = data.recurring.filter((r) => r.isContract && r.endMonth);
      for (const c of contracts) ideas.push(`${c.name} (${fmtEUR(c.amount)}) läuft bis ${monthLabel(c.endMonth!, true)} – rechtzeitig günstigeren Tarif vergleichen.`);
      return { question: q, answer: ideas.length ? ideas.join("\n") : "Keine offensichtlichen Einsparpotenziale in den erfassten Daten.", basis: "Abos, Verträge, Budgetabweichungen" };
    }
    case QUESTIONS[3]:
      return {
        question: q,
        answer: act.savingsRate !== null ? `Ist: ${fmtPct(act.savingsRate * 100)} · Plan: ${fmtPct(plan.savingsRate * 100)}` : `Plan: ${fmtPct(plan.savingsRate * 100)} (Ist nicht berechenbar)`,
        basis: "Sparquote = (Einnahmen − Konsumausgaben) / Einnahmen",
        missing: act.savingsRate === null ? "Keine Einnahmen-Buchungen in diesem Monat." : undefined,
      };
    case QUESTIONS[4]: {
      const target = "2029-12";
      const months = Math.max(1, (2029 - now.getFullYear()) * 12 + 12 - (now.getMonth() + 1));
      const sc = scenarioPresets(data.settings.salaryGrowthPct, data.settings.safeInterestPct);
      const r = (["conservative", "realistic", "ambitious"] as const).map((k) => ({ k, p: project(data, month, months, sc[k]).at(-1)! }));
      return { question: q, answer: r.map(({ k, p }) => `${sc[k].label}: ${fmtEUR(p.property)}`).join(" · "), basis: `Prognose bis ${monthLabel(target, true)} – Annahmen: Szenario-Parameter, Kreditende berücksichtigt, Überschuss fließt ins Eigenkapital.` };
    }
    case QUESTIONS[5]: {
      const ps = propertyStatus(data, now);
      return { question: q, answer: ps.onTrack ? `Ja (realistisches Szenario): Prognose ${fmtEUR(ps.projectedAtTarget)} ≥ Ziel ${fmtEUR(ps.target)}.` : `Nein: Prognose ${fmtEUR(ps.projectedAtTarget)} < Ziel ${fmtEUR(ps.target)}. Nötig: ${fmtEUR(ps.requiredMonthly)}/Monat.`, basis: `Kaufpreis ${fmtEUR(data.property.purchasePrice)}, Zieldatum ${data.property.targetDate}. Keine Finanzierungszusage – nur Rechnung.` };
    }
    case QUESTIONS[6]: {
      const months = Array.from({ length: 13 }, (_, i) => addMonths(month, i - 12));
      const h = wealthHistory(data, months);
      if (h.length < 2) return { question: q, answer: "Kein Verlauf verfügbar.", basis: "Snapshots", missing: "Mindestens zwei Monats-Snapshots nötig." };
      const first = h[0];
      const last = h[h.length - 1];
      return { question: q, answer: `${fmtEUR(first.total)} (${monthLabel(first.month)}) → ${fmtEUR(last.total)} (${monthLabel(last.month)}): ${last.total >= first.total ? "+" : ""}${fmtEUR(last.total - first.total)}.`, basis: `${h.length} Snapshots (Bruttovermögen)` };
    }
    case QUESTIONS[7]: {
      const items = generateInsights(data, now).filter((i) => i.severity === "warning" || i.severity === "critical");
      return { question: q, answer: items.length ? items.map((i) => `• ${i.title}${i.action ? ` → ${i.action}` : ""}`).join("\n") : "Aktuell keine kritischen Punkte in den erfassten Daten.", basis: "Regelbasierte Prüfung aller Bereiche" };
    }
  }
  return { question: q, answer: "Unbekannte Frage.", basis: "" };
}

/** Kompakte, aggregierte Faktenbasis für einen externen KI-Provider (keine Einzeltransaktionen). */
export function buildFactSheet(data: FinanceData, now: Date = new Date()) {
  const month = toMonth(now);
  const plan = planForMonth(data, month);
  const act = actualsForMonth(data.transactions, month);
  const prevAct = actualsForMonth(data.transactions, addMonths(month, -1));
  const summary = wealthSummary(data);
  const ps = propertyStatus(data, now);
  const report = buildMonthReport(data, month);
  const cat = (r: Record<ExpenseCategory, number>) => Object.fromEntries(Object.entries(r).filter(([, v]) => v > 0));
  return {
    month,
    isDemoData: data.settings.demoMode,
    plan: { income: plan.income, fixedCosts: plan.fixedCosts, variableBudget: plan.variableBudget, investments: plan.investments, surplusToProperty: plan.surplus, plannedSavingsRate: round2(plan.savingsRate * 100), byCategory: cat(plan.byCategory) },
    actualThisMonth: act.hasData ? { income: act.income, spending: act.spending, savingsRate: act.savingsRate !== null ? round2(act.savingsRate * 100) : null, byCategory: cat(act.byCategory) } : "FEHLT",
    actualPreviousMonth: prevAct.hasData ? { income: prevAct.income, spending: prevAct.spending, byCategory: cat(prevAct.byCategory) } : "FEHLT",
    wealth: { liquid: summary.liquid, propertyEquity: summary.property, invested: summary.invested, investedContributions: summary.contributionsInvested, debts: summary.debts, netWorth: summary.netWorth },
    property: { purchasePrice: data.property.purchasePrice, region: data.property.region, targetDate: data.property.targetDate, equityTarget: ps.target, equityNow: ps.equity, requiredMonthly: ps.requiredMonthly, plannedMonthly: ps.currentMonthly, projectedAtTarget: ps.projectedAtTarget, monthlyOwnerCost: ps.financing.monthlyOwnerCost, interestAssumptionPct: data.property.interestRate },
    scheduledChanges: data.recurring.filter((r) => r.endMonth || r.startMonth > month).map((r) => ({ name: r.name, amount: r.amount, kind: r.kind, startMonth: r.startMonth, endMonth: r.endMonth ?? null })),
    overBudget: report.overBudget,
    openBills: report.openBills,
    missingData: report.missing,
    ruleBasedInsights: generateInsights(data, now).map((i) => ({ severity: i.severity, title: i.title })),
  };
}
