import type { Destination } from "./types";

/**
 * Derived, transparent scores. These are computed from the (estimated) raw
 * climate and travel data with simple, documented formulas – so the influence
 * of August weather and travel time is reproducible rather than hand-tuned.
 */

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface WeatherBreakdown {
  score: number;
  reasons: string[];
}

/**
 * August weather score (0–100).
 * - temperature: ideal 27–32 °C; −8/°C below, −6/°C for 33–36 °C, −9/°C above 36 °C
 * - rain: −3.5 per average rain day
 * - sea: −5 per °C below 24 °C (skipped for city trips)
 * - flags: monsoon −12, typhoon −10, humid −5, windy −4, meltemi −3, winter season −6
 */
export function weatherScore(dest: Destination): WeatherBreakdown {
  const { tMax, rainDays, sea, flags } = dest.climate;
  let s = 100;
  const reasons: string[] = [];
  if (tMax < 27) {
    s -= (27 - tMax) * 8;
    reasons.push(`eher mild (Ø ${tMax} °C)`);
  } else if (tMax > 32) {
    const warm = Math.min(tMax, 36) - 32;
    const hot = Math.max(0, tMax - 36);
    s -= warm * 6 + hot * 9;
    reasons.push(tMax >= 38 ? `extreme Hitze (Ø ${tMax} °C)` : `sehr heiß (Ø ${tMax} °C)`);
  }
  if (rainDays > 0) {
    s -= rainDays * 3.5;
    if (rainDays >= 8) reasons.push(`regnerisch (≈ ${rainDays} Regentage)`);
  }
  if (sea !== null && sea < 24) {
    s -= (24 - sea) * 5;
    reasons.push(`kühleres Meer (≈ ${sea} °C)`);
  }
  if (flags.includes("monsoon")) {
    s -= 12;
    reasons.push("Monsun: Seegang & eingeschränkte Bootstouren");
  }
  if (flags.includes("typhoon")) {
    s -= 10;
    reasons.push("Taifunrisiko");
  }
  if (flags.includes("humid")) s -= 5;
  if (flags.includes("windy")) s -= 4;
  if (flags.includes("meltemi")) s -= 3;
  if (flags.includes("winterSeason")) {
    s -= 6;
    reasons.push("Südwinter");
  }
  return { score: Math.round(clamp(s, 5)), reasons };
}

export function avgTransferMin(dest: Destination): number {
  const [a, b] = dest.travel.transferMin;
  return (a + b) / 2;
}

/** Total one-way travel time (flight + average transfer) in hours. */
export function totalTravelHours(dest: Destination): number {
  return dest.travel.flightH + avgTransferMin(dest) / 60;
}

/**
 * Reachability score from Berlin (0–100).
 * 100 up to 3.5 h door-to-hotel (excl. way to BER); −7.5 per extra hour;
 * −4 when there is no direct connection (extra connection risk).
 * Relation to a 7-night trip: two travel days of 12 h+ cost roughly a full holiday day.
 */
export function accessScore(dest: Destination): number {
  const total = totalTravelHours(dest);
  let s = 100 - Math.max(0, total - 3.5) * 7.5;
  if (dest.travel.direct === "none") s -= 4;
  if (dest.travel.direct === "limited") s -= 2;
  return Math.round(clamp(s, 5));
}

/** Share of the 7-day trip spent travelling (outbound + return), in %. */
export function travelShareOfTrip(dest: Destination): number {
  const hours = totalTravelHours(dest) * 2;
  return Math.round((hours / (7 * 24)) * 100);
}

export function costMid(dest: Destination): number {
  return (dest.cost[0] + dest.cost[1]) / 2;
}

/** General suitability for a young couple's summer escape (used for the 5 % share). */
export function generalSuitability(dest: Destination): number {
  const r = dest.ratings;
  return Math.round((r.youngCouples * 2 + r.beach + r.hotels + r.romance + r.food) / 6);
}

export function formatHours(h: number): string {
  const hours = Math.floor(h);
  const min = Math.round((h - hours) * 60);
  if (min === 0) return `${hours} Std.`;
  return `${hours} Std. ${min} Min.`;
}

export function formatMinutesRange([a, b]: [number, number]): string {
  const fmt = (m: number) => (m >= 90 ? `${(m / 60).toFixed(m % 60 === 0 ? 0 : 1).replace(".", ",")} Std.` : `${m} Min.`);
  return a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n) + " €";
}
