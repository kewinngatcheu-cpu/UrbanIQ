/**
 * WEALTH OS – zentrales Datenmodell.
 * Alle Beträge in EUR (number, 2 Nachkommastellen). Monate als "YYYY-MM".
 */

export type Month = string; // "YYYY-MM"
export type ISODate = string; // "YYYY-MM-DD"

export const CATEGORIES = [
  "Wohnen",
  "Lebensmittel",
  "Freizeit",
  "Kleidung",
  "Reisen",
  "Transport",
  "Gesundheit",
  "Abonnements",
  "Versicherungen",
  "Kredite",
  "Investments",
  "Sparen",
  "Sonstiges",
] as const;
export type ExpenseCategory = (typeof CATEGORIES)[number];
export type Category = ExpenseCategory | "Einkommen";

/** Kategorien, die als Vermögensaufbau zählen (keine Konsumausgabe). */
export const SAVINGS_CATEGORIES: Category[] = ["Investments", "Sparen"];

/** Kategorien, die zum "persönlichen Budget" (max. 200 €) zählen. */
export const DEFAULT_PERSONAL_CATEGORIES: ExpenseCategory[] = [
  "Lebensmittel",
  "Freizeit",
  "Kleidung",
  "Transport",
  "Sonstiges",
];

export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  date: ISODate;
  amount: number; // immer positiv; Richtung über type
  type: TxType;
  category: Category;
  description: string;
  accountId?: string;
  recurringId?: string; // gesetzt, wenn aus wiederkehrender Zahlung gebucht
  source: "manual" | "csv" | "recurring" | "deposit";
  isDemo?: boolean;
}

export type RecurringKind = "income" | "expense" | "investment" | "saving";
export type Interval = "monthly" | "quarterly" | "yearly";

/** Wiederkehrende Einnahmen, Fixkosten, Verträge, Abos, Sparpläne. */
export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  kind: RecurringKind;
  category: Category;
  interval: Interval;
  dayOfMonth: number; // Fälligkeitstag 1–28
  startMonth: Month; // erster aktiver Monat (inkl.)
  endMonth?: Month; // letzter aktiver Monat (inkl.); leer = unbefristet
  isSubscription?: boolean; // in Abo-Übersicht
  isContract?: boolean; // Vertrag mit Laufzeit
  cancellationNotice?: string; // z. B. "3 Monate zum Laufzeitende"
  targetAccountId?: string; // für Spar-/Investmentpläne
  debtId?: string; // Rate gehört zu einer Schuld
  note?: string;
}

/** Variable Budgets je Kategorie (Soll). */
export interface Budget {
  id: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  startMonth?: Month;
  endMonth?: Month;
}

export type AccountBucket = "liquid" | "property" | "invested" | "other";
export type AccountType =
  | "checking"
  | "savings"
  | "emergency"
  | "property_equity"
  | "broker"
  | "other_investment"
  | "cash";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bucket: AccountBucket;
  institution?: string;
  /** Kontostand bzw. Cash-Bestand. Bei Depots: Cash; Positionen separat in holdings. */
  balance: number;
  /** Summe aller Einzahlungen (Netto) – trennt Einzahlungen von Rendite. */
  contributions: number;
  interestRate?: number; // % p.a. (Tagesgeld)
  isDemo?: boolean;
}

export type HoldingType = "etf" | "stock" | "bond" | "crypto" | "fund" | "other";

export interface Holding {
  id: string;
  accountId: string;
  name: string;
  isin?: string;
  symbol?: string; // für Kursabfrage, z. B. "VWCE.DEX"
  type: HoldingType;
  quantity: number;
  avgPrice: number; // Einstandskurs je Stück
  currentPrice: number;
  priceDate?: ISODate;
  priceSource?: "manual" | "alphavantage";
  isDemo?: boolean;
}

export interface BalanceSnapshot {
  id: string; // `${accountId}:${month}`
  accountId: string;
  month: Month;
  value: number; // Gesamtwert (inkl. Positionen)
  contributions: number;
}

export interface Debt {
  id: string;
  name: string;
  lender?: string;
  balance: number; // aktuelle Restschuld
  interestRate: number; // % p.a. (0 wenn unbekannt)
  monthlyPayment: number;
  endMonth?: Month; // letzte Rate (inkl.)
  balanceIsEstimate?: boolean;
}

export type GoalType = "property" | "emergency" | "travel" | "investment" | "custom";

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate?: ISODate;
  linkedAccountIds: string[]; // aktueller Stand = Summe dieser Konten
  manualCurrent?: number; // falls keine Konten verknüpft
  priority: 1 | 2 | 3;
}

export type Region = "berlin" | "brandenburg" | "custom";
export type Usage = "self" | "rental";

export interface PropertyPlan {
  id: "main";
  purchasePrice: number;
  location: string;
  region: Region;
  sizeSqm: number;
  equity?: number; // leer = aus Immobilien-Konten
  transferTaxRate: number; // % Grunderwerbsteuer
  notaryRate: number; // % Notar + Grundbuch
  brokerRate: number; // % Makler (Käuferanteil inkl. MwSt.)
  interestRate: number; // % Sollzins p.a.
  repaymentRate: number; // % anfängliche Tilgung p.a.
  fixationYears: number;
  hoaMonthly: number; // Hausgeld gesamt
  hoaNonAllocableShare: number; // % nicht umlagefähig
  maintenancePerSqmYear: number; // Instandhaltungsrücklage €/m²/Jahr
  lendingValueDiscount: number; // % Sicherheitsabschlag Beleihungswert
  usage: Usage;
  expectedColdRentPerSqm: number; // €/m² Kaltmiete (Kapitalanlage)
  vacancyRiskPct: number; // % Mietausfallwagnis
  targetDate: ISODate;
  equityTargetPct: number; // Ziel-Eigenkapital in % des Kaufpreises zusätzlich zu Nebenkosten
  rateSource?: string;
}

export interface Settings {
  id: "main";
  ownerName?: string;
  demoMode: boolean;
  personalBudgetCap: number;
  personalCategories: ExpenseCategory[];
  emergencyFundMonths: number;
  salaryGrowthPct: number;
  safeInterestPct: number; // Tagesgeld-Zins für Prognose
  warnThresholdPct: number; // Budgetwarnung ab x %
  consent: {
    ai: boolean;
    marketData: boolean;
    interestRates: boolean;
  };
  lastBackupAt?: string;
  /** Erwartete Einkommensänderung (z. B. Berufseinstieg) für Prognosen. */
  careerStart?: { month: Month; netIncome: number };
}

export interface MonthClosing {
  id: Month;
  closedAt: string;
  summary: MonthReport;
  notes?: string;
}

export interface AiReport {
  id: string;
  month: Month;
  createdAt: string;
  provider: string;
  model?: string;
  content: string;
}

/** Komplettdatensatz – Basis aller Berechnungen und Backups. */
export interface FinanceData {
  settings: Settings;
  transactions: Transaction[];
  recurring: RecurringItem[];
  budgets: Budget[];
  accounts: Account[];
  holdings: Holding[];
  snapshots: BalanceSnapshot[];
  debts: Debt[];
  goals: Goal[];
  property: PropertyPlan;
  closings: MonthClosing[];
  aiReports: AiReport[];
}

/** Ergebnis eines Monatsabschlusses (auch für KI-/PDF-Bericht). */
export interface MonthReport {
  month: Month;
  plannedIncome: number;
  actualIncome: number | null;
  plannedSpending: number;
  actualSpending: number | null;
  plannedSavings: number;
  actualSavings: number | null;
  plannedSavingsRate: number;
  actualSavingsRate: number | null;
  netWorth: number;
  netWorthChange: number | null;
  overBudget: { category: string; planned: number; actual: number }[];
  openBills: { name: string; amount: number; dueDay: number }[];
  goals: { name: string; progressPct: number; current: number; target: number }[];
  missing: string[];
}
