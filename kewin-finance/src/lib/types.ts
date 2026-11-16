/** KEWIN FINANCE – Datenmodell. Beträge in Euro, Monate als "YYYY-MM", Datum als "YYYY-MM-DD". */

export type Month = string;
export type ISODate = string;

export const CATEGORIES = [
  "Lebensmittel",
  "Freizeit",
  "Kleidung",
  "Transport",
  "Fitness",
  "Gesundheit",
  "Abonnements",
  "Reisen",
  "Sonstiges",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Reisen läuft über das Reisebudget, alles andere über das persönliche Budget. */
export const TRAVEL_CATEGORY: Category = "Reisen";

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: ISODate;
  note?: string;
  createdAt: string;
}

/** Wiederkehrende Plan-Posten: Einnahmen, Fixkosten, Sparpläne – mit optionaler Laufzeit. */
export type PlanKind = "income" | "fixed" | "savings";
export interface PlanItem {
  id: string;
  name: string;
  amount: number;
  kind: PlanKind;
  dayOfMonth: number; // 1–28
  startMonth?: Month; // erster Monat (inkl.)
  endMonth?: Month; // letzter Monat (inkl.), z. B. Kredit "2027-03"
  goalId?: string; // Sparplan → Sparziel
  autoBook?: boolean; // Sparplan automatisch dem Ziel gutschreiben
}

export type GoalType = "property" | "travel" | "emergency" | "investment" | "custom";
export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  target: number;
  startAmount: number; // Stand bei Anlage (von dir eingegeben)
  monthlyPlan: number; // geplanter monatlicher Sparbetrag (zusätzlich zu Sparplänen)
  targetDate?: ISODate;
  createdAt: string;
  order: number;
}

/**
 * Sparbewegungen.
 * - deposit:    Bankguthaben → Ziel   (verfügbares Geld sinkt, Nettovermögen bleibt gleich)
 * - withdrawal: Ziel → Bankguthaben   (Gegenteil)
 * - transfer:   Ziel → Ziel           (nur Umschichtung, keine Wirkung auf Summen)
 * - valuation:  Wertänderung im Ziel  (Zinsen, Kursgewinne/-verluste – ändert das Nettovermögen; kann negativ sein)
 */
export type MovementKind = "deposit" | "withdrawal" | "transfer" | "valuation";
export interface Movement {
  id: string;
  kind: MovementKind;
  amount: number; // deposit/withdrawal/transfer: > 0; valuation: ±
  date: ISODate;
  goalId: string; // Ziel (deposit, valuation, transfer: Empfänger) bzw. Quelle (withdrawal)
  fromGoalId?: string; // transfer: Quelle
  note?: string;
  planItemId?: string; // automatisch aus Sparplan gebucht
  createdAt: string;
}

/** Manuell gepflegte Vermögenswerte außerhalb der Sparziele. */
export type AccountType = "bank" | "tagesgeld" | "investment" | "other";
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  /** Zeitpunkt, zu dem du den Stand eingetragen hast. Sparbewegungen danach werden (beim Bankkonto) automatisch verrechnet. */
  balanceSetAt: string;
  isMainBank?: boolean;
}

export interface Debt {
  id: string;
  name: string;
  balance: number; // Restschuld nach der Rate von `asOfMonth`
  asOfMonth: Month;
  monthlyPayment: number;
  dueDay: number;
  endMonth?: Month;
  isEstimate?: boolean;
}

export interface Snapshot {
  month: Month;
  assets: number;
  debts: number;
  netWorth: number;
  updatedAt: string;
}

export interface Settings {
  id: "main";
  ownerName: string;
  personalBudget: number;
  travelBudget: number;
  autoBookFrom: Month; // Sparpläne werden erst ab diesem Monat automatisch gebucht (kein Rückwärts-Erfinden)
  skippedAuto: string[]; // gelöschte automatische Buchungen (nicht neu erzeugen)
  createdAt: string;
}

export interface FinanceData {
  settings: Settings;
  plan: PlanItem[];
  expenses: Expense[];
  goals: Goal[];
  movements: Movement[];
  accounts: Account[];
  debts: Debt[];
  snapshots: Snapshot[];
}
