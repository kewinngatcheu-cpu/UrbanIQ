import type { Month } from "../types";

export const toMonth = (d: Date | string): Month =>
  typeof d === "string" ? d.slice(0, 7) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function addMonths(m: Month, n: number): Month {
  const [y, mm] = m.split("-").map(Number);
  const t = y * 12 + (mm - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export function monthDiff(a: Month, b: Month): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return by * 12 + bm - (ay * 12 + am);
}

export const inRange = (m: Month, start?: Month, end?: Month) => (!start || m >= start) && (!end || m <= end);

const SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function monthLabel(m: Month, long = true): string {
  const [y, mm] = m.split("-").map(Number);
  return long ? `${LONG[mm - 1]} ${y}` : `${SHORT[mm - 1]} ${String(y).slice(2)}`;
}

export const monthsOfYear = (year: number): Month[] => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

export function daysInMonth(m: Month): number {
  const [y, mm] = m.split("-").map(Number);
  return new Date(y, mm, 0).getDate();
}
