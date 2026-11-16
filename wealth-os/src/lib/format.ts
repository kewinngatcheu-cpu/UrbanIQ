const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });

export const fmtEUR = (v: number) => eur.format(Math.round(v));
export const fmtEUR2 = (v: number) => eur2.format(v);
export const fmtNum = (v: number) => num.format(v);
export const fmtCompactEUR = (v: number) => `${compact.format(v)} €`;
export const fmtPct = (v: number, digits = 1) =>
  `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)} %`;

export const round2 = (v: number) => Math.round(v * 100) / 100;

/** Parst "1.234,56", "1234.56", "-12,5 €" usw. → number | null */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = input.trim().replace(/[€\s ]|EUR/gi, "");
  if (!s) return null;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Das spätere Trennzeichen ist das Dezimaltrennzeichen
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  } else if (lastDot > -1) {
    // "1.234" (Tausender) vs "12.34" (Dezimal): genau 3 Ziffern nach letztem Punkt & mehrere Punkte → Tausender
    const parts = s.split(".");
    if (parts.length > 2) s = parts.join("");
  }
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return negative ? -Math.abs(v) : v;
}

/** Parst "31.12.2026", "2026-12-31", "12/31/2026" → ISO-Datum oder null */
export function parseDate(input: string): string | null {
  const s = input.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

export function uid(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
