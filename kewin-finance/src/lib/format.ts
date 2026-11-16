const eur0 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Ganze Euro ohne Nachkommastellen, sonst mit Cent. */
export const eur = (v: number) => (Math.abs(v - Math.round(v)) < 0.005 ? eur0.format(Math.round(v)) : eur2.format(v));
export const eurRound = (v: number) => eur0.format(Math.round(v));
export const pct = (v: number, digits = 0) =>
  `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)} %`;
export const compactEur = (v: number) =>
  Math.abs(v) >= 1000 ? `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(v / 1000)}k` : `${Math.round(v)}`;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export function uid(prefix: string): string {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${r}`;
}

export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** "12,50" / "12.5" / "1.234,56" → 12.5 / 1234.56 */
export function parseEuro(input: string): number | null {
  let s = input.trim().replace(/[€\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
