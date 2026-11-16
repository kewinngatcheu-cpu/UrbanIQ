import { describe, expect, it } from "vitest";
import { guessMapping, mapRows, parseCsv, suggestCategory } from "../csv";
import { parseAmount, parseDate } from "../../format";

describe("Parser", () => {
  it("Beträge in deutschem & englischem Format", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("-12,50 €")).toBe(-12.5);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("161")).toBe(161);
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("abc")).toBeNull();
  });
  it("Datumsformate", () => {
    expect(parseDate("31.12.2026")).toBe("2026-12-31");
    expect(parseDate("1.3.27")).toBe("2027-03-01");
    expect(parseDate("2026-11-05T10:00:00")).toBe("2026-11-05");
  });
});

describe("CSV-Import", () => {
  const csv = `Kontoauszug Girokonto\nZeitraum: 01.11.2026 - 30.11.2026\n\nBuchungstag;Verwendungszweck;Betrag\n01.11.2026;GEHALT November;1.400,00\n03.11.2026;REWE SAGT DANKE;-23,45\n04.11.2026;Spotify AB;-10,00\nxx;kaputt;-1\n`;
  it("findet Kopfzeile hinter Vorspann & ordnet Spalten zu", () => {
    const p = parseCsv(csv);
    expect(p.headers).toEqual(["Buchungstag", "Verwendungszweck", "Betrag"]);
    const m = guessMapping(p.headers);
    expect(m).toMatchObject({ date: "Buchungstag", amount: "Betrag", description: "Verwendungszweck" });
  });
  it("mappt Zeilen, kategorisiert & meldet Fehler", () => {
    const p = parseCsv(csv);
    const rows = mapRows(p.rows, { date: "Buchungstag", amount: "Betrag", description: "Verwendungszweck" });
    expect(rows).toHaveLength(4);
    expect(rows[0].tx).toMatchObject({ type: "income", amount: 1400, category: "Einkommen" });
    expect(rows[1].tx).toMatchObject({ type: "expense", amount: 23.45, category: "Lebensmittel" });
    expect(rows[2].tx?.category).toBe("Abonnements");
    expect(rows[3].ok).toBe(false);
  });
  it("erkennt Duplikate", () => {
    const p = parseCsv(csv);
    const first = mapRows(p.rows, { date: "Buchungstag", amount: "Betrag", description: "Verwendungszweck" });
    const again = mapRows(p.rows, { date: "Buchungstag", amount: "Betrag", description: "Verwendungszweck" }, first.filter((r) => r.tx).map((r) => r.tx!));
    expect(again.filter((r) => r.duplicate)).toHaveLength(3);
  });
  it("Kategorie-Vorschläge", () => {
    expect(suggestCategory("Trade Republic Sparplan", false)).toBe("Investments");
    expect(suggestCategory("Irgendwas", false)).toBe("Sonstiges");
  });
});
