import type { FinanceData } from "./types";

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = (v: number) => v.toFixed(2).replace(".", ",");
const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(";")).join("\n");

const KIND = { deposit: "Einzahlung", withdrawal: "Entnahme", transfer: "Umschichtung", valuation: "Wertänderung" } as const;

/** CSV (Semikolon, deutsches Zahlenformat – öffnet direkt in Excel/Numbers). */
export function expensesCsv(data: FinanceData, filter?: (date: string) => boolean): string {
  const list = data.expenses.filter((e) => !filter || filter(e.date));
  return toCsv([["Datum", "Kategorie", "Betrag (EUR)", "Beschreibung"], ...list.map((e) => [e.date, e.category, num(e.amount), e.note ?? ""])]);
}

export function movementsCsv(data: FinanceData, filter?: (date: string) => boolean): string {
  const name = (id?: string) => data.goals.find((g) => g.id === id)?.name ?? "";
  const list = data.movements.filter((m) => !filter || filter(m.date));
  return toCsv([["Datum", "Art", "Sparziel", "Von Sparziel", "Betrag (EUR)", "Notiz"], ...list.map((m) => [m.date, KIND[m.kind], name(m.goalId), name(m.fromGoalId), num(m.amount), m.note ?? ""])]);
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" + content : content], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
