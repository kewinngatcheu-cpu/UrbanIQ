/**
 * Bank CSV import (no bank connection – the owner exports a CSV from online banking and uploads it).
 * Handles common German formats: ';' or ',' separated, quoted fields, "1.234,56" amounts, dd.mm.yyyy dates,
 * single amount column or separate debit/credit (Soll/Haben) columns.
 */
import { createHash } from "node:crypto";
import { CATEGORIES, type Kind } from "./calc";

export interface ParsedTx { day: string; amount_cents: number; description: string; category: string; kind: Kind; import_hash: string }
export interface ParseResult { rows: ParsedTx[]; skipped: { line: number; reason: string }[]; columns: Record<string, string | null> }

export function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[€\s]|EUR/gi, "").replace(/−/g, "-");
  if (!s) return null;
  let neg = false;
  if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  // Decide decimal separator: the last of ',' / '.' followed by 1–2 digits at the end
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round((neg ? -n : n) * 100);
}

export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

const RULES: [RegExp, string][] = [
  [/miete|wohnung|nebenkosten|hausverwaltung|strom|vattenfall|gasag|stadtwerke/i, "miete"],
  [/netflix|spotify|disney|apple\.com|icloud|amazon prime|youtube|chatgpt|openai|anthropic|claude|notion|adobe|handy|vodafone|telekom|o2|congstar|fitx|mcfit|urban sports/i, "abos"],
  [/versicherung|allianz|huk|tk |techniker|aok|barmer/i, "versicherung"],
  [/hwr|semesterbeitrag|studierendenwerk|hochschule|uni/i, "uni"],
  [/rewe|edeka|lidl|aldi|netto|penny|kaufland|dm-drogerie|rossmann|bio company|denns|lieferando|wolt/i, "lebensmittel"],
  [/bvg|s-bahn|deutsche bahn|db vertrieb|\bdb\b|uber|bolt|tier|lime|miles|share now|tankstelle|aral|shell/i, "transport"],
  [/zalando|amazon|h&m|zara|ikea|mediamarkt|saturn|about you/i, "shopping"],
  [/kino|restaurant|bar |club|eventim|steam|playstation|bistro|cafe|café/i, "freizeit"],
  [/apotheke|arzt|zahnarzt|physio/i, "gesundheit"],
  [/sparplan|tagesgeld|sparen/i, "sparen"],
  [/trade republic|scalable|etf|depot|comdirect depot|ing depot|bitpanda/i, "investments"],
  [/gehalt|lohn|bafög|bafoeg|stipendium|kindergeld|honorar|rechnung .* bezahlt/i, "einkommen"],
];

export function categorize(description: string, amountCents: number): { category: string; kind: Kind } {
  for (const [re, cat] of RULES) {
    if (re.test(description)) {
      const kind = CATEGORIES[cat].kind;
      // An inflow categorised as an expense (e.g. a refund) stays an inflow → treat as income/refund.
      if (amountCents > 0 && kind !== "income") return { category: "einkommen", kind: "income" };
      return { category: cat, kind };
    }
  }
  return amountCents > 0 ? { category: "einkommen", kind: "income" } : { category: "sonstiges", kind: "variable" };
}

const find = (headers: string[], patterns: RegExp[]) => {
  for (const p of patterns) { const i = headers.findIndex((h) => p.test(h)); if (i >= 0) return i; }
  return -1;
};

export function parseBankCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  // Some banks prepend account info lines; the header is the first line containing a date-like column name.
  const headerIdx = lines.findIndex((l) => /datum|date|buchungstag|valuta/i.test(l));
  if (headerIdx < 0) return { rows: [], skipped: [{ line: 1, reason: "Keine Kopfzeile mit Datumsspalte gefunden" }], columns: {} };
  const headerLine = lines[headerIdx];
  const delim = [";", "\t", ","].map((d) => [d, headerLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const headers = parseCsvLine(headerLine, delim).map((h) => h.toLowerCase());
  const iDate = find(headers, [/^buchungstag$/, /^buchungsdatum$/, /datum/, /date/, /valuta/]);
  const iAmount = find(headers, [/^betrag/, /amount/, /umsatz/, /^wert$/]);
  const iDebit = find(headers, [/^soll/, /debit/, /ausgang/]);
  const iCredit = find(headers, [/^haben/, /credit/, /eingang/]);
  const iDesc = find(headers, [/verwendungszweck/, /beschreibung/, /description/, /buchungstext/, /text/]);
  const iParty = find(headers, [/empfänger|empfaenger|auftraggeber|zahlungspflichtige|beguenstigter|begünstigter|name|payee|gegenpartei/]);
  const columns = {
    date: iDate >= 0 ? headers[iDate] : null, amount: iAmount >= 0 ? headers[iAmount] : null,
    debit: iDebit >= 0 ? headers[iDebit] : null, credit: iCredit >= 0 ? headers[iCredit] : null,
    description: iDesc >= 0 ? headers[iDesc] : null, counterparty: iParty >= 0 ? headers[iParty] : null,
  };
  const rows: ParsedTx[] = [];
  const skipped: ParseResult["skipped"] = [];
  if (iDate < 0 || (iAmount < 0 && iDebit < 0 && iCredit < 0)) {
    return { rows, skipped: [{ line: headerIdx + 1, reason: "Datums- oder Betragsspalte nicht erkannt" }], columns };
  }
  const seen = new Map<string, number>();
  for (let li = headerIdx + 1; li < lines.length; li++) {
    const f = parseCsvLine(lines[li], delim);
    const day = parseDate(f[iDate] ?? "");
    let amount: number | null = null;
    if (iAmount >= 0) amount = parseAmount(f[iAmount] ?? "");
    else {
      const d = iDebit >= 0 ? parseAmount(f[iDebit] ?? "") : null;
      const c = iCredit >= 0 ? parseAmount(f[iCredit] ?? "") : null;
      amount = (c ? Math.abs(c) : 0) - (d ? Math.abs(d) : 0);
      if (!d && !c) amount = null;
    }
    if (!day) { skipped.push({ line: li + 1, reason: "Datum nicht lesbar" }); continue; }
    if (amount == null || amount === 0) { skipped.push({ line: li + 1, reason: "Betrag fehlt oder 0" }); continue; }
    const description = [iParty >= 0 ? f[iParty] : "", iDesc >= 0 ? f[iDesc] : ""].filter(Boolean).join(" · ").slice(0, 300);
    const { category, kind } = categorize(description, amount);
    const base = `${day}|${amount}|${description}`;
    const n = (seen.get(base) ?? 0) + 1; // identical rows on the same day are legitimate (e.g. two coffees)
    seen.set(base, n);
    rows.push({ day, amount_cents: amount, description, category, kind, import_hash: createHash("sha256").update(`${base}|${n}`).digest("hex") });
  }
  return { rows, skipped, columns };
}
