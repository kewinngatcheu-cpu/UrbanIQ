import type { Account, AccountBucket, BalanceSnapshot, FinanceData, Holding, Month } from "../types";
import { round2 } from "../format";

export function holdingValue(h: Holding): number {
  return h.quantity * h.currentPrice;
}
export function holdingCost(h: Holding): number {
  return h.quantity * h.avgPrice;
}

/** Gesamtwert eines Kontos: Kontostand + Wert der Positionen. */
export function accountValue(account: Account, holdings: Holding[]): number {
  const pos = holdings.filter((h) => h.accountId === account.id).reduce((s, h) => s + holdingValue(h), 0);
  return round2(account.balance + pos);
}

export interface WealthSummary {
  liquid: number;
  property: number; // Immobilien-Eigenkapital (angespart)
  invested: number;
  other: number;
  totalAssets: number; // Gesamtvermögen (brutto)
  debts: number;
  netWorth: number;
  contributionsInvested: number;
  returnsInvested: number; // invested - contributions
  byAccount: { account: Account; value: number }[];
}

export function wealthSummary(data: Pick<FinanceData, "accounts" | "holdings" | "debts">): WealthSummary {
  const sums: Record<AccountBucket, number> = { liquid: 0, property: 0, invested: 0, other: 0 };
  let contributionsInvested = 0;
  const byAccount = data.accounts.map((account) => {
    const value = accountValue(account, data.holdings);
    sums[account.bucket] += value;
    if (account.bucket === "invested") contributionsInvested += account.contributions;
    return { account, value };
  });
  const totalAssets = sums.liquid + sums.property + sums.invested + sums.other;
  const debts = data.debts.reduce((s, d) => s + d.balance, 0);
  return {
    liquid: round2(sums.liquid),
    property: round2(sums.property),
    invested: round2(sums.invested),
    other: round2(sums.other),
    totalAssets: round2(totalAssets),
    debts: round2(debts),
    netWorth: round2(totalAssets - debts),
    contributionsInvested: round2(contributionsInvested),
    returnsInvested: round2(sums.invested - contributionsInvested),
    byAccount,
  };
}

export interface WealthHistoryPoint {
  month: Month;
  liquid: number;
  property: number;
  invested: number;
  other: number;
  total: number;
  investedContributions: number;
}

/** Vermögensverlauf aus Snapshots. Monate ohne Snapshot werden ausgelassen (keine erfundenen Werte). */
export function wealthHistory(
  data: Pick<FinanceData, "accounts" | "snapshots">,
  months: Month[],
): WealthHistoryPoint[] {
  const bucketOf = new Map(data.accounts.map((a) => [a.id, a.bucket] as const));
  const out: WealthHistoryPoint[] = [];
  for (const month of months) {
    const snaps = data.snapshots.filter((s) => s.month === month && bucketOf.has(s.accountId));
    if (snaps.length === 0) continue;
    const p: WealthHistoryPoint = { month, liquid: 0, property: 0, invested: 0, other: 0, total: 0, investedContributions: 0 };
    for (const s of snaps) {
      const b = bucketOf.get(s.accountId)!;
      p[b] += s.value;
      p.total += s.value;
      if (b === "invested") p.investedContributions += s.contributions;
    }
    out.push(roundPoint(p));
  }
  return out;
}

function roundPoint(p: WealthHistoryPoint): WealthHistoryPoint {
  return {
    ...p,
    liquid: round2(p.liquid),
    property: round2(p.property),
    invested: round2(p.invested),
    other: round2(p.other),
    total: round2(p.total),
    investedContributions: round2(p.investedContributions),
  };
}

/** Erzeugt Snapshots für alle Konten zum angegebenen Monat (überschreibt bestehende). */
export function makeSnapshots(data: Pick<FinanceData, "accounts" | "holdings">, month: Month): BalanceSnapshot[] {
  return data.accounts.map((a) => ({
    id: `${a.id}:${month}`,
    accountId: a.id,
    month,
    value: accountValue(a, data.holdings),
    contributions: a.contributions,
  }));
}

/** Notgroschen: Zielbetrag = Monate × essenzielle Monatskosten. */
export function emergencyFund(essentialMonthlyCosts: number, months: number, currentLiquid: number) {
  const target = round2(essentialMonthlyCosts * months);
  const gap = round2(Math.max(0, target - currentLiquid));
  return {
    target,
    current: currentLiquid,
    gap,
    coverageMonths: essentialMonthlyCosts > 0 ? currentLiquid / essentialMonthlyCosts : 0,
    progressPct: target > 0 ? Math.min(100, (currentLiquid / target) * 100) : 100,
  };
}
