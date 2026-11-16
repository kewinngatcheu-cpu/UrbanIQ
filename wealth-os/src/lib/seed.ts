/**
 * Startdaten.
 * - baselineData(): deine echten Planungswerte aus dem Briefing (Einkommen, Fixkosten, Budgets) – Kontostände 0.
 * - demoData(): baseline + FIKTIVE Kontostände, Historie, Transaktionen, Depotpositionen (DEMO-DATEN).
 */
import type { Account, BalanceSnapshot, Budget, Debt, FinanceData, Goal, Holding, Month, PropertyPlan, RecurringItem, Settings, Transaction } from "./types";
import { DEFAULT_PERSONAL_CATEGORIES } from "./types";
import { addMonths, daysInMonth, monthDiff, toMonth } from "./finance/months";
import { DEFAULT_RATE_ASSUMPTION, equityLevels, purchaseCosts } from "./finance/property";
import { round2 } from "./format";

export const ACC = {
  giro: "acc_giro",
  emergency: "acc_emergency",
  property: "acc_property",
  tr: "acc_traderepublic",
} as const;

export function defaultSettings(demoMode: boolean): Settings {
  return {
    id: "main",
    demoMode,
    personalBudgetCap: 200,
    personalCategories: [...DEFAULT_PERSONAL_CATEGORIES],
    emergencyFundMonths: 3,
    salaryGrowthPct: 2,
    safeInterestPct: 2,
    warnThresholdPct: 80,
    consent: { ai: false, marketData: false, interestRates: false },
  };
}

export function defaultProperty(now: Date): PropertyPlan {
  return {
    id: "main",
    purchasePrice: 200_000,
    location: "Berlin",
    region: "berlin",
    sizeSqm: 50,
    transferTaxRate: 6.0,
    notaryRate: 2.0,
    brokerRate: 3.57,
    interestRate: DEFAULT_RATE_ASSUMPTION.value,
    repaymentRate: 2.0,
    fixationYears: 10,
    hoaMonthly: 250,
    hoaNonAllocableShare: 35,
    maintenancePerSqmYear: 9,
    lendingValueDiscount: 10,
    usage: "self",
    expectedColdRentPerSqm: 13,
    vacancyRiskPct: 3,
    targetDate: `${now.getFullYear() + 4}-06-30`,
    equityTargetPct: 10,
    rateSource: DEFAULT_RATE_ASSUMPTION.label,
  };
}

function recurringBaseline(start: Month): RecurringItem[] {
  const r = (p: Omit<RecurringItem, "interval" | "startMonth"> & Partial<RecurringItem>): RecurringItem => ({ interval: "monthly", startMonth: start, ...p });
  return [
    r({ id: "rec_income", name: "Nettoeinkommen", amount: 1400, kind: "income", category: "Einkommen", dayOfMonth: 1 }),
    r({ id: "rec_loan", name: "Kreditrate", amount: 161, kind: "expense", category: "Kredite", dayOfMonth: 1, endMonth: "2027-03", debtId: "debt_loan", isContract: true, note: "Letzte Rate März 2027 – ab April 2027 frei." }),
    r({ id: "rec_gym", name: "Fitnessstudio", amount: 28, kind: "expense", category: "Gesundheit", dayOfMonth: 1, isSubscription: true }),
    r({ id: "rec_phone", name: "Handyvertrag", amount: 45, kind: "expense", category: "Abonnements", dayOfMonth: 5, isContract: true, endMonth: addMonths(start, 23), cancellationNotice: "Rechtzeitig vor Laufzeitende kündigen / Tarif vergleichen" }),
    r({ id: "rec_aok", name: "AOK Krankenversicherung", amount: 150, kind: "expense", category: "Versicherungen", dayOfMonth: 1 }),
    r({ id: "rec_claude", name: "Claude", amount: 22, kind: "expense", category: "Abonnements", dayOfMonth: 12, isSubscription: true }),
    r({ id: "rec_chatgpt", name: "ChatGPT", amount: 7, kind: "expense", category: "Abonnements", dayOfMonth: 14, isSubscription: true }),
    r({ id: "rec_apple", name: "Apple", amount: 9, kind: "expense", category: "Abonnements", dayOfMonth: 20, isSubscription: true }),
    r({ id: "rec_spotify", name: "Spotify", amount: 10, kind: "expense", category: "Abonnements", dayOfMonth: 22, isSubscription: true }),
    r({ id: "rec_tr", name: "Trade Republic Sparplan", amount: 150, kind: "investment", category: "Investments", dayOfMonth: 2, targetAccountId: ACC.tr }),
  ];
}

function budgetsBaseline(): Budget[] {
  return [
    { id: "bud_food", category: "Lebensmittel", monthlyLimit: 70 },
    { id: "bud_fun", category: "Freizeit", monthlyLimit: 50 },
    { id: "bud_clothes", category: "Kleidung", monthlyLimit: 30 },
    { id: "bud_transport", category: "Transport", monthlyLimit: 30 },
    { id: "bud_misc", category: "Sonstiges", monthlyLimit: 20 },
    { id: "bud_travel", category: "Reisen", monthlyLimit: 200 },
  ];
}

function accountsBaseline(): Account[] {
  return [
    { id: ACC.giro, name: "Girokonto", type: "checking", bucket: "liquid", balance: 0, contributions: 0 },
    { id: ACC.emergency, name: "Tagesgeld – Notgroschen", type: "emergency", bucket: "liquid", balance: 0, contributions: 0, interestRate: 2 },
    { id: ACC.property, name: "Immobilien-Eigenkapital (Tagesgeld)", type: "property_equity", bucket: "property", balance: 0, contributions: 0, interestRate: 2 },
    { id: ACC.tr, name: "Trade Republic Depot", type: "broker", bucket: "invested", institution: "Trade Republic", balance: 0, contributions: 0 },
  ];
}

function goalsBaseline(now: Date): Goal[] {
  const p = defaultProperty(now);
  const target = equityLevels(purchaseCosts(p.purchasePrice, p.transferTaxRate, p.notaryRate, p.brokerRate), p.equityTargetPct).target;
  return [
    { id: "goal_property", name: "Eigenkapital erste Eigentumswohnung", type: "property", targetAmount: target, targetDate: `${now.getFullYear() + 4}-06-30`, linkedAccountIds: [ACC.property], priority: 1 },
    { id: "goal_emergency", name: "Notgroschen (3 Monate)", type: "emergency", targetAmount: 2_700, linkedAccountIds: [ACC.emergency], priority: 1 },
    { id: "goal_travel", name: "Reisekasse", type: "travel", targetAmount: 1_200, targetDate: `${now.getFullYear() + 1}-07-31`, linkedAccountIds: [], manualCurrent: 0, priority: 3 },
  ];
}

function debtsBaseline(now: Date): Debt[] {
  // Rate ist am 1. fällig → ist der Tag vorbei, gilt die Rate des laufenden Monats als bezahlt.
  const dueDay = 1;
  const remaining = Math.max(0, monthDiff(toMonth(now), "2027-03") + (now.getDate() >= dueDay ? 0 : 1));
  return [{ id: "debt_loan", name: "Kredit", balance: 161 * remaining, interestRate: 0, monthlyPayment: 161, endMonth: "2027-03", balanceIsEstimate: true }];
}

export function baselineData(now: Date = new Date()): FinanceData {
  const start = toMonth(now);
  return {
    settings: defaultSettings(false),
    transactions: [],
    recurring: recurringBaseline(start),
    budgets: budgetsBaseline(),
    accounts: accountsBaseline(),
    holdings: [],
    snapshots: [],
    debts: debtsBaseline(now),
    goals: goalsBaseline(now),
    property: defaultProperty(now),
    closings: [],
    aiReports: [],
  };
}

/* ───────────────────────── DEMO-DATEN (fiktiv) ───────────────────────── */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function demoData(now: Date = new Date()): FinanceData {
  const base = baselineData(now);
  const month = toMonth(now);
  const rand = rng(42);

  base.settings = { ...defaultSettings(true), careerStart: { month: `${now.getFullYear() + 2}-10`, netIncome: 2600 } };

  // Rückwirkend gültige Planung für Historie
  base.recurring = base.recurring.map((r) => (r.id === "rec_phone" ? r : { ...r, startMonth: addMonths(month, -12) }));

  const accounts: Account[] = [
    { id: ACC.giro, name: "Girokonto", type: "checking", bucket: "liquid", balance: 640, contributions: 0, isDemo: true },
    { id: ACC.emergency, name: "Tagesgeld – Notgroschen", type: "emergency", bucket: "liquid", balance: 1850, contributions: 1850, interestRate: 2, isDemo: true },
    { id: ACC.property, name: "Immobilien-Eigenkapital (Tagesgeld)", type: "property_equity", bucket: "property", balance: 6420, contributions: 6300, interestRate: 2, isDemo: true },
    { id: ACC.tr, name: "Trade Republic Depot", type: "broker", bucket: "invested", institution: "Trade Republic", balance: 12.4, contributions: 2400, isDemo: true },
  ];

  const priceDate = `${month}-${String(Math.min(now.getDate(), 28)).padStart(2, "0")}`;
  const holdings: Holding[] = [
    { id: "h_vwce", accountId: ACC.tr, name: "Vanguard FTSE All-World (Acc)", isin: "IE00BK5BQT80", symbol: "VWCE.DEX", type: "etf", quantity: 12.8, avgPrice: 124.1, currentPrice: 141.3, priceDate, priceSource: "manual", isDemo: true },
    { id: "h_em", accountId: ACC.tr, name: "iShares Core MSCI EM IMI (Acc)", isin: "IE00BKM4GZ66", symbol: "IS3N.DEX", type: "etf", quantity: 14.2, avgPrice: 33.4, currentPrice: 36.2, priceDate, priceSource: "manual", isDemo: true },
    { id: "h_btc", accountId: ACC.tr, name: "Bitcoin (Demo)", type: "crypto", quantity: 0.0012, avgPrice: 82000, currentPrice: 88500, priceDate, priceSource: "manual", isDemo: true },
  ];

  // 12 Monate Historie (fiktiv)
  const snapshots: BalanceSnapshot[] = [];
  for (let i = 12; i >= 1; i--) {
    const m = addMonths(month, -i);
    const k = 12 - i; // 0..11
    const trContrib = 2400 - 150 * i;
    const trValue = trContrib * (1 + 0.004 * k + (rand() - 0.5) * 0.05);
    const vals: [string, number, number][] = [
      [ACC.giro, 500 + rand() * 300, 0],
      [ACC.emergency, 1200 + k * 55, 1200 + k * 55],
      [ACC.property, 1600 + k * 420, 1600 + k * 410],
      [ACC.tr, trValue, trContrib],
    ];
    for (const [accountId, value, contributions] of vals) snapshots.push({ id: `${accountId}:${m}`, accountId, month: m, value: round2(value), contributions: round2(contributions) });
  }

  // Transaktionen: 2 volle Vormonate + laufender Monat bis heute
  const txs: Transaction[] = [];
  const add = (date: string, amount: number, type: Transaction["type"], category: Transaction["category"], description: string, extra: Partial<Transaction> = {}) =>
    txs.push({ id: `tx_demo_${txs.length}`, date, amount: round2(amount), type, category, description, source: "manual", isDemo: true, accountId: ACC.giro, ...extra });

  for (let back = 2; back >= 0; back--) {
    const m = addMonths(month, -back);
    const lastDay = back === 0 ? Math.max(1, now.getDate()) : daysInMonth(m);
    const day = (d: number) => `${m}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
    const inMonth = (d: number) => d <= lastDay;

    for (const r of base.recurring) {
      if (r.startMonth > m || (r.endMonth && r.endMonth < m) || !inMonth(r.dayOfMonth)) continue;
      add(day(r.dayOfMonth), r.amount, r.kind === "income" ? "income" : "expense", r.category, r.name, { recurringId: r.id, source: "recurring" });
    }
    // Eigenkapital-Überweisung am 3.
    if (inMonth(3)) add(day(3), 380 + Math.round(rand() * 60), "expense", "Sparen", "Übertrag Immobilien-Eigenkapital");

    const spend: [Transaction["category"], string[], number, number][] = [
      ["Lebensmittel", ["REWE", "Lidl", "Edeka", "Bäckerei"], 4, 22],
      ["Freizeit", ["Kino", "Restaurant", "Lieferando", "Bar"], 3, 22],
      ["Transport", ["BVG Einzelfahrt", "Tier Scooter", "DB Regio"], 2, 14],
      ["Kleidung", ["Zalando", "Uniqlo"], back === 1 ? 2 : 1, back === 1 ? 38 : 25],
      ["Sonstiges", ["Amazon", "dm-Drogerie"], 2, 9],
    ];
    for (const [cat, names, count, avg] of spend) {
      for (let j = 0; j < count; j++) {
        const d = 3 + Math.floor(rand() * 25);
        if (!inMonth(d)) continue;
        add(day(d), avg * (0.6 + rand() * 0.8), "expense", cat, names[Math.floor(rand() * names.length)]);
      }
    }
    if (back === 1 && inMonth(18)) add(day(18), 164, "expense", "Reisen", "Flixbus + Hostel Hamburg");
    if (back === 0 && inMonth(9)) add(day(9), 89, "expense", "Reisen", "Ryanair Anzahlung");
  }

  return { ...base, accounts, holdings, snapshots, transactions: txs };
}
