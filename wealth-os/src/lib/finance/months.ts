import type { Month } from "../types";

export function toMonth(date: Date | string): Month {
  if (typeof date === "string") return date.slice(0, 7);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function currentMonth(now: Date = new Date()): Month {
  return toMonth(now);
}

export function parseMonth(m: Month): { y: number; m: number } {
  const [y, mm] = m.split("-").map(Number);
  return { y, m: mm };
}

export function addMonths(m: Month, n: number): Month {
  const { y, m: mm } = parseMonth(m);
  const total = y * 12 + (mm - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Anzahl Monate von a nach b (b - a). */
export function monthDiff(a: Month, b: Month): number {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  return pb.y * 12 + pb.m - (pa.y * 12 + pa.m);
}

export function isMonthInRange(m: Month, start?: Month, end?: Month): boolean {
  if (start && m < start) return false;
  if (end && m > end) return false;
  return true;
}

export function monthRange(start: Month, count: number): Month[] {
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTH_NAMES_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function monthLabel(m: Month, long = false): string {
  const { y, m: mm } = parseMonth(m);
  return long ? `${MONTH_NAMES_LONG[mm - 1]} ${y}` : `${MONTH_NAMES[mm - 1]} ${String(y).slice(2)}`;
}

export function daysInMonth(m: Month): number {
  const { y, m: mm } = parseMonth(m);
  return new Date(y, mm, 0).getDate();
}
