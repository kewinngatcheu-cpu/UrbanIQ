import Papa from "papaparse";
import type { Category, Transaction } from "../types";
import { CATEGORIES } from "../types";
import { parseAmount, parseDate, uid } from "../format";

export interface CsvMapping {
  date: string;
  amount: string;
  description: string;
  /** Optional: separate Spalten für Soll/Haben (manche Banken) */
  debit?: string;
  credit?: string;
  category?: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

/** CSV parsen; Banken-Exporte haben oft Vorspannzeilen – wir suchen die Kopfzeile. */
export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /(datum|date|buchung|valuta)/i.test(l) && /(betrag|amount|umsatz|soll|haben|wert)/i.test(l));
  const body = headerIdx > 0 ? lines.slice(headerIdx).join("\n") : clean;
  const res = Papa.parse<Record<string, string>>(body, { header: true, skipEmptyLines: true, delimiter: "", transformHeader: (h) => h.trim() });
  return { headers: (res.meta.fields ?? []).filter(Boolean), rows: res.data, delimiter: res.meta.delimiter };
}

const find = (headers: string[], patterns: RegExp[]) => headers.find((h) => patterns.some((p) => p.test(h)));

/** Spaltenzuordnung automatisch erraten (deutsche & englische Bank-/Broker-Exporte, inkl. Trade-Republic-Transaktionsexport). */
export function guessMapping(headers: string[]): Partial<CsvMapping> {
  return {
    date: find(headers, [/^buchungstag$/i, /^buchungsdatum$/i, /^datum$/i, /^date$/i, /buchung/i, /datum/i, /date/i, /valuta/i]),
    amount: find(headers, [/^betrag/i, /^amount$/i, /umsatz/i, /betrag/i, /amount/i, /wert/i]),
    description: find(headers, [/verwendungszweck/i, /beschreibung/i, /description/i, /empf(ä|ae)nger/i, /auftraggeber/i, /name/i, /^typ$/i, /type/i, /text/i]),
    debit: find(headers, [/^soll/i, /^debit/i, /ausgang/i]),
    credit: find(headers, [/^haben/i, /^credit/i, /eingang/i]),
    category: find(headers, [/^kategorie$/i, /^category$/i]),
  };
}

/** Kategorie-Vorschlag anhand von Schlüsselwörtern. */
const RULES: [RegExp, Category][] = [
  [/(gehalt|lohn|salary|bafög|stipendium|werkstudent|einkommen|gutschrift gehalt)/i, "Einkommen"],
  [/(rewe|edeka|aldi|lidl|netto|penny|kaufland|dm-|rossmann|bäcker|supermarkt)/i, "Lebensmittel"],
  [/(miete|nebenkosten|strom|vattenfall|gasag|wohnung)/i, "Wohnen"],
  [/(bvg|db vertrieb|deutsche bahn|vbb|tank|aral|shell|uber|bolt|tier|lime|deutschlandticket)/i, "Transport"],
  [/(spotify|netflix|apple\.com|icloud|chatgpt|openai|anthropic|claude|disney|amazon prime|youtube)/i, "Abonnements"],
  [/(aok|tk |techniker|barmer|haftpflicht|versicherung|allianz|huk)/i, "Versicherungen"],
  [/(apotheke|arzt|fitness|mcfit|urban sports|gym)/i, "Gesundheit"],
  [/(zalando|h&m|zara|uniqlo|about you|snipes)/i, "Kleidung"],
  [/(lufthansa|ryanair|easyjet|airbnb|booking\.com|hotel|flixbus|eurowings)/i, "Reisen"],
  [/(trade republic|sparplan|etf|depot|scalable)/i, "Investments"],
  [/(tagesgeld|sparkonto|notgroschen|übertrag spar)/i, "Sparen"],
  [/(kredit|darlehen|rate )/i, "Kredite"],
  [/(kino|restaurant|bar |lieferando|wolt|konzert|steam|playstation)/i, "Freizeit"],
];

export function suggestCategory(description: string, isIncome: boolean): Category {
  for (const [re, cat] of RULES) if (re.test(description)) return cat;
  return isIncome ? "Einkommen" : "Sonstiges";
}

export interface ImportPreviewRow {
  ok: boolean;
  error?: string;
  tx?: Transaction;
  duplicate?: boolean;
}

export function mapRows(rows: Record<string, string>[], mapping: CsvMapping, existing: Transaction[] = []): ImportPreviewRow[] {
  const key = (t: Pick<Transaction, "date" | "amount" | "type" | "description">) => `${t.date}|${t.type}|${t.amount.toFixed(2)}|${t.description.slice(0, 40).toLowerCase()}`;
  const existingKeys = new Set(existing.map(key));
  const seen = new Set<string>();
  return rows.map((r) => {
    const date = parseDate(r[mapping.date] ?? "");
    if (!date) return { ok: false, error: `Ungültiges Datum: "${r[mapping.date] ?? ""}"` };
    let amount: number | null = null;
    if (mapping.amount && r[mapping.amount] !== undefined && r[mapping.amount] !== "") amount = parseAmount(r[mapping.amount]);
    else if (mapping.debit || mapping.credit) {
      const d = mapping.debit ? parseAmount(r[mapping.debit]) : null;
      const c = mapping.credit ? parseAmount(r[mapping.credit]) : null;
      amount = (c ? Math.abs(c) : 0) - (d ? Math.abs(d) : 0);
      if (!d && !c) amount = null;
    }
    if (amount === null || amount === 0) return { ok: false, error: `Ungültiger Betrag: "${r[mapping.amount] ?? ""}"` };
    const description = (r[mapping.description] ?? "").trim() || "(ohne Beschreibung)";
    const type = amount > 0 ? "income" : "expense";
    const rawCat = mapping.category ? (r[mapping.category] ?? "").trim() : "";
    const category: Category = (CATEGORIES as readonly string[]).includes(rawCat) || rawCat === "Einkommen" ? (rawCat as Category) : suggestCategory(description, type === "income");
    const tx: Transaction = { id: uid("tx"), date, amount: Math.abs(amount), type, category: type === "income" && category !== "Einkommen" && !["Sparen", "Investments"].includes(category) ? "Einkommen" : category, description, source: "csv" };
    const k = key(tx);
    const duplicate = existingKeys.has(k) || seen.has(k);
    seen.add(k);
    return { ok: true, tx, duplicate };
  });
}

export function transactionsToCsv(txs: Transaction[]): string {
  return Papa.unparse(
    txs.map((t) => ({ Datum: t.date, Typ: t.type === "income" ? "Einnahme" : "Ausgabe", Kategorie: t.category, Beschreibung: t.description, Betrag: (t.type === "income" ? t.amount : -t.amount).toFixed(2).replace(".", ","), Quelle: t.source })),
    { delimiter: ";" },
  );
}
