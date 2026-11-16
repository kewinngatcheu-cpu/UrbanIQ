/** Export-Funktionen (laufen nur im Browser; schwere Bibliotheken werden bei Bedarf nachgeladen). */
import type { FinanceData, MonthReport } from "./types";
import { monthLabel } from "./finance/months";
import { planForMonth, actualsForMonth } from "./finance/plan";
import { wealthSummary, accountValue } from "./finance/wealth";
import { fmtEUR, fmtPct } from "./format";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8") {
  // BOM, damit Excel UTF-8-CSV korrekt öffnet
  const content = type.startsWith("text/csv") ? "﻿" + text : text;
  downloadBlob(filename, new Blob([content], { type }));
}

/** Excel-Arbeitsmappe mit allen Datenbereichen. */
export async function exportXlsx(data: FinanceData) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Wealth OS";
  wb.created = new Date();
  const sheet = (name: string, columns: { header: string; key: string; width?: number; numFmt?: string }[], rows: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(name);
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.numFmt ? { numFmt: c.numFmt } : undefined }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    rows.forEach((r) => ws.addRow(r));
  };
  const eur = '#,##0.00 "€"';
  const s = wealthSummary(data);
  sheet("Übersicht", [{ header: "Kennzahl", key: "k", width: 32 }, { header: "Wert", key: "v", width: 18, numFmt: eur }], [
    { k: "Gesamtvermögen", v: s.totalAssets },
    { k: "Liquide", v: s.liquid },
    { k: "Investiert", v: s.invested },
    { k: "davon Einzahlungen", v: s.contributionsInvested },
    { k: "Immobilien-Eigenkapital", v: s.property },
    { k: "Schulden", v: s.debts },
    { k: "Nettovermögen", v: s.netWorth },
  ]);
  sheet("Transaktionen", [
    { header: "Datum", key: "date", width: 12 }, { header: "Typ", key: "type", width: 10 }, { header: "Kategorie", key: "category" },
    { header: "Beschreibung", key: "description", width: 36 }, { header: "Betrag", key: "amount", numFmt: eur }, { header: "Quelle", key: "source", width: 10 },
  ], data.transactions.map((t) => ({ ...t, type: t.type === "income" ? "Einnahme" : "Ausgabe", amount: t.type === "income" ? t.amount : -t.amount })));
  sheet("Wiederkehrend", [
    { header: "Name", key: "name", width: 28 }, { header: "Art", key: "kind" }, { header: "Kategorie", key: "category" }, { header: "Betrag", key: "amount", numFmt: eur },
    { header: "Intervall", key: "interval" }, { header: "Fällig am", key: "dayOfMonth", width: 10 }, { header: "Ab", key: "startMonth", width: 10 }, { header: "Bis", key: "endMonth", width: 10 },
  ], data.recurring as never);
  sheet("Budgets", [{ header: "Kategorie", key: "category" }, { header: "Limit", key: "monthlyLimit", numFmt: eur }, { header: "Ab", key: "startMonth" }, { header: "Bis", key: "endMonth" }], data.budgets as never);
  sheet("Konten", [{ header: "Konto", key: "name", width: 34 }, { header: "Bereich", key: "bucket" }, { header: "Wert", key: "value", numFmt: eur }, { header: "Einzahlungen", key: "contributions", numFmt: eur }],
    data.accounts.map((a) => ({ ...a, value: accountValue(a, data.holdings) })));
  sheet("Positionen", [
    { header: "Name", key: "name", width: 34 }, { header: "ISIN", key: "isin" }, { header: "Stück", key: "quantity" }, { header: "Einstand", key: "avgPrice", numFmt: eur },
    { header: "Kurs", key: "currentPrice", numFmt: eur }, { header: "Wert", key: "value", numFmt: eur }, { header: "Kursdatum", key: "priceDate" },
  ], data.holdings.map((h) => ({ ...h, value: h.quantity * h.currentPrice })));
  sheet("Snapshots", [{ header: "Monat", key: "month" }, { header: "Konto", key: "accountId", width: 24 }, { header: "Wert", key: "value", numFmt: eur }, { header: "Einzahlungen", key: "contributions", numFmt: eur }], data.snapshots as never);
  sheet("Schulden", [{ header: "Name", key: "name" }, { header: "Restschuld", key: "balance", numFmt: eur }, { header: "Zins %", key: "interestRate" }, { header: "Rate", key: "monthlyPayment", numFmt: eur }, { header: "Ende", key: "endMonth" }], data.debts as never);
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(`wealth-os-${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

/** Monatsbericht als PDF. */
export async function exportMonthPdf(data: FinanceData, report: MonthReport, tasks: string[], aiText?: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 48;
  const txt = (s: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(s, W - 96);
    if (y + lines.length * size * 1.3 > 800) {
      doc.addPage();
      y = 48;
    }
    doc.text(lines, 48, y);
    y += lines.length * size * 1.3 + 4;
  };
  // jsPDF-Standardschriften kennen kein "€"-Problem, aber kein "−" → ersetzen
  const clean = (s: string) => s.replace(/−/g, "-").replace(/ | /g, " ");
  const e = (v: number | null) => (v === null ? "FEHLT" : clean(fmtEUR(v)));
  const p = (v: number | null) => (v === null ? "FEHLT" : clean(fmtPct(v * 100)));

  txt(`Wealth OS – Monatsbericht ${monthLabel(report.month, true)}`, 16, true);
  txt(`Erstellt am ${new Date().toLocaleDateString("de-DE")}${data.settings.demoMode ? " · ENTHÄLT DEMO-DATEN (fiktiv)" : ""}`, 9);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [["Kennzahl", "Plan", "Ist"]],
    body: [
      ["Einnahmen", e(report.plannedIncome), e(report.actualIncome)],
      ["Konsumausgaben", e(report.plannedSpending), e(report.actualSpending)],
      ["Ersparnis", e(report.plannedSavings), e(report.actualSavings)],
      ["Sparquote", p(report.plannedSavingsRate), p(report.actualSavingsRate)],
      ["Nettovermögen", "", e(report.netWorth)],
      ["Veränderung ggü. Vormonat (brutto)", "", e(report.netWorthChange)],
    ],
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [42, 120, 214] },
    margin: { left: 48, right: 48 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  if (report.overBudget.length) {
    txt("Auffälligkeiten – Budgetüberschreitungen", 11, true);
    autoTable(doc, { startY: y, head: [["Kategorie", "Soll", "Ist"]], body: report.overBudget.map((o) => [o.category, e(o.planned), e(o.actual)]), theme: "grid", styles: { fontSize: 9 }, margin: { left: 48, right: 48 } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }
  if (report.goals.length) {
    txt("Zielfortschritt", 11, true);
    autoTable(doc, { startY: y, head: [["Ziel", "Stand", "Ziel", "Fortschritt"]], body: report.goals.map((g) => [g.name, e(g.current), e(g.target), clean(fmtPct(g.progressPct, 0))]), theme: "grid", styles: { fontSize: 9 }, margin: { left: 48, right: 48 } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }
  if (report.openBills.length) txt(`Offene Rechnungen: ${clean(report.openBills.map((b) => `${b.name} ${fmtEUR(b.amount)} (am ${b.dueDay}.)`).join(", "))}`);
  if (report.missing.length) {
    txt("Fehlende Daten", 11, true);
    report.missing.forEach((m) => txt(`• ${m}`));
  }
  txt("Aufgaben für den nächsten Monat", 11, true);
  tasks.forEach((t) => txt(`• ${clean(t)}`));
  if (aiText) {
    y += 6;
    txt("KI-Analyse", 11, true);
    txt(clean(aiText.replace(/[#*`]/g, "")), 9);
  }
  y += 8;
  txt("Hinweis: Automatisch berechnet aus den in Wealth OS gespeicherten Daten. Keine Anlage-, Steuer- oder Finanzierungsberatung.", 8);
  doc.save(`monatsbericht-${report.month}.pdf`);
}

/** Kurzer Text-Report (z. B. zum Kopieren). */
export function reportToText(data: FinanceData, month: string) {
  const plan = planForMonth(data, month);
  const a = actualsForMonth(data.transactions, month);
  return `Monat ${monthLabel(month, true)}: Einnahmen ${a.hasData ? fmtEUR(a.income) : "FEHLT"} (Plan ${fmtEUR(plan.income)}), Ausgaben ${a.hasData ? fmtEUR(a.spending) : "FEHLT"} (Plan ${fmtEUR(plan.plannedSpending)}).`;
}
