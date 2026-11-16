import { round2 } from "../format";

/** Annuitätendarlehen (deutsches Modell): Monatsrate = Darlehen × (Sollzins + anf. Tilgung) / 12. */
export function annuityMonthlyRate(principal: number, interestPct: number, repaymentPct: number): number {
  if (principal <= 0) return 0;
  return round2((principal * (interestPct + repaymentPct)) / 100 / 12);
}

/** Restschuld nach n Monaten bei konstanter Rate (monatliche Verzinsung). */
export function remainingBalance(principal: number, interestPct: number, monthlyRate: number, months: number): number {
  if (principal <= 0) return 0;
  const r = interestPct / 100 / 12;
  if (r === 0) return round2(Math.max(0, principal - monthlyRate * months));
  const f = Math.pow(1 + r, months);
  const bal = principal * f - monthlyRate * ((f - 1) / r);
  return round2(Math.max(0, bal));
}

/** Laufzeit in Monaten bis zur vollständigen Tilgung (null, wenn Rate Zinsen nicht deckt). */
export function payoffMonths(principal: number, interestPct: number, monthlyRate: number): number | null {
  if (principal <= 0) return 0;
  const r = interestPct / 100 / 12;
  if (r === 0) return monthlyRate > 0 ? Math.ceil(principal / monthlyRate) : null;
  if (monthlyRate <= principal * r) return null;
  return Math.ceil(-Math.log(1 - (r * principal) / monthlyRate) / Math.log(1 + r));
}

export interface AmortizationRow {
  index: number; // 1-basiert
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/** Tilgungsplan (max. maxMonths Zeilen). */
export function amortizationSchedule(
  principal: number,
  interestPct: number,
  monthlyRate: number,
  maxMonths = 600,
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const r = interestPct / 100 / 12;
  let balance = principal;
  for (let i = 1; i <= maxMonths && balance > 0.005; i++) {
    const interest = balance * r;
    let payment = monthlyRate;
    if (payment > balance + interest) payment = balance + interest;
    const princ = payment - interest;
    if (princ <= 0) break; // Rate deckt Zinsen nicht
    balance = balance - princ;
    rows.push({ index: i, payment: round2(payment), interest: round2(interest), principal: round2(princ), balance: round2(Math.max(0, balance)) });
  }
  return rows;
}
