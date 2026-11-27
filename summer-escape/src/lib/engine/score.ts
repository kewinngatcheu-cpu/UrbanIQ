import type { Destination, World } from "../destinations/types";
import { accessScore, avgTransferMin, costMid, generalSuitability, totalTravelHours, weatherScore } from "../destinations/derived";
import { DIMS, destinationFeatures, type Dim, type Vec } from "./features";
import type { Profile } from "./profile";

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/* ───────────────────────── building blocks ───────────────────────── */

/** Weighted preference fit 0–100 for a normalised weight vector. */
export function prefFit(share: Vec, d: Destination): number {
  const f = destinationFeatures(d);
  let s = 0;
  for (const k of DIMS) s += share[k] * f[k];
  return s;
}

export function worldBonus(worlds: World[], d: Destination, max = 15): number {
  if (!worlds.length) return 0;
  return Math.max(...worlds.map((w) => d.worlds[w] ?? 0)) * max;
}

export function budgetScore(range: { lo: number; hi: number }, stretchFactor: number, d: Destination): number {
  const mid = costMid(d);
  let s: number;
  if (mid >= range.lo && mid <= range.hi) s = 100;
  else if (mid < range.lo) s = 100 - Math.min(25, ((range.lo - mid) / range.lo) * 60);
  else s = 100 - ((mid - range.hi) / range.hi) * stretchFactor;
  // A destination whose lower price end still fits is never hopeless.
  if (d.cost[0] <= range.hi) s = Math.max(s, 55);
  return clamp(s);
}

export function transferScore(tolMin: number, d: Destination): number {
  const avg = avgTransferMin(d);
  return avg <= tolMin ? 100 : clamp(100 - (avg - tolMin) * 0.5);
}

/** Thresholds for the non-negotiables of question 14. */
export const MUST_CHECKS: Record<string, { label: string; test: (d: Destination) => number }> = {
  // value returned = how far below the threshold (0 = fulfilled)
  // "warm" = reliably warm & swimmable – rain showers alone do not break it, monsoon or a cool season does.
  warm: {
    label: "Warmes Wetter",
    test: (d) =>
      Math.max(0, 26 - d.climate.tMax) * 4 +
      Math.max(0, 23 - (d.climate.sea ?? 23)) * 4 +
      (d.climate.flags.includes("monsoon") || d.climate.flags.includes("winterSeason") ? 12 : 0),
  },
  beach: { label: "Schöner Strand", test: (d) => Math.max(0, 75 - d.ratings.beach) },
  water: { label: "Kristallklares Wasser", test: (d) => Math.max(0, 80 - d.ratings.water) },
  pool: { label: "Schönes Hotel mit Pool", test: (d) => Math.max(0, 78 - d.ratings.pools) },
  transfer: { label: "Kurzer Flughafentransfer", test: (d) => Math.max(0, (avgTransferMin(d) - 60) / 3) },
  food: { label: "Gute Restaurants", test: (d) => Math.max(0, 78 - d.ratings.food) },
  evening: { label: "Musik und Abendstimmung", test: (d) => Math.max(0, 72 - (d.ratings.evening + d.ratings.music) / 2) },
  uncrowded: { label: "Keine überfüllten Orte", test: (d) => Math.max(0, d.ratings.crowding - 65) },
  romance: { label: "Romantische Atmosphäre", test: (d) => Math.max(0, 78 - d.ratings.romance) },
  excursions: { label: "Ausflugsmöglichkeiten", test: (d) => Math.max(0, 78 - d.ratings.excursions) },
  value: { label: "Gutes Preis-Leistungs-Verhältnis", test: (d) => Math.max(0, 68 - d.ratings.value) },
};

export function mustPenalty(musts: string[], d: Destination): { penalty: number; missed: string[] } {
  let penalty = 0;
  const missed: string[] = [];
  for (const m of musts) {
    const c = MUST_CHECKS[m];
    if (!c) continue;
    const gap = c.test(d);
    if (gap > 0) {
      penalty += Math.min(20, gap * 0.8 + 4);
      missed.push(c.label);
    }
  }
  return { penalty, missed };
}

export function dealbreakerPenalty(p: Profile, d: Destination): number {
  let s = 0;
  for (const rule of p.dealbreakers) {
    switch (rule.id) {
      case "party":
        if (d.tags.includes("partyHeavy")) s += 12;
        break;
      case "heat":
        if (d.climate.tMax >= 35) s += Math.min(16, (d.climate.tMax - 34) * 3);
        break;
      case "rain":
        if (d.climate.rainDays >= 8 || d.climate.flags.includes("monsoon") || d.climate.flags.includes("typhoon")) s += 10;
        break;
      case "longTrip":
        if (totalTravelHours(d) > 8) s += 10;
        else if (avgTransferMin(d) > 120) s += 6;
        break;
      case "crowds":
        if (d.ratings.crowding >= 80) s += 8;
        break;
      case "massResort":
        if (d.tags.includes("allInclusive")) s += 6;
        break;
      case "coldWater":
        if (d.climate.sea !== null && d.climate.sea < 23) s += 8;
        break;
      case "expensive":
        if (d.ratings.value < 50) s += 6;
        break;
      case "boring":
        if (d.ratings.evening < 60) s += 6;
        break;
      case "dirty":
        if (d.ratings.water < 70) s += 5;
        break;
    }
  }
  return s;
}

/** Exploration level & crowd sensitivity → soft penalties. */
export function stylePenalty(p: Profile, d: Destination): number {
  let s = 0;
  const desiredExc = 25 + p.exploration * 7;
  if (d.ratings.excursions < desiredExc) s += (desiredExc - d.ratings.excursions) * 0.12;
  if (p.exploration <= 3 && d.ratings.calm < 50) s += (50 - d.ratings.calm) * 0.1;
  if (p.avoidCrowds >= 7 && d.ratings.crowding > 70) s += (d.ratings.crowding - 70) * 0.08 * (p.avoidCrowds - 6);
  return s;
}

/* ───────────────────────── individual ───────────────────────── */

export interface IndividualScore {
  id: string;
  total: number;
  pref: number;
  budget: number;
  weather: number;
  access: number;
  general: number;
  penalty: number;
  missedMusts: string[];
}

export function scoreIndividual(p: Profile, d: Destination): IndividualScore {
  const pref = clamp(prefFit(p.share, d) + worldBonus(p.worlds, d));
  const budget = budgetScore(p.budget, p.budget.stretch ? 180 : 300, d);
  const weather = weatherScore(d).score;
  const access = 0.5 * accessScore(d) + 0.5 * transferScore(p.transferTolMin, d);
  const general = generalSuitability(d);

  const w = { pref: 0.6, budget: 0.14, weather: 0.12, access: 0.09 * p.accessImportance, general: 0.05 };
  if (p.musts.includes("warm")) w.weather *= 1.5;
  if (p.musts.includes("value")) w.budget *= 1.3;
  // A tight budget band makes money matter more.
  if (p.budget.hi <= 1800) w.budget *= 1.35;
  else if (p.budget.hi <= 2000) w.budget *= 1.15;
  const sumW = w.pref + w.budget + w.weather + w.access + w.general;
  const base = (w.pref * pref + w.budget * budget + w.weather * weather + w.access * access + w.general * general) / sumW;

  const must = mustPenalty(p.musts, d);
  const penalty = must.penalty + dealbreakerPenalty(p, d) + stylePenalty(p, d);
  return {
    id: d.id,
    total: clamp(base - penalty),
    pref,
    budget,
    weather,
    access,
    general,
    penalty,
    missedMusts: must.missed,
  };
}

/* ───────────────────────── couple ───────────────────────── */

export interface CoupleWeights {
  shared: number;
  satisfaction: number;
  budget: number;
  weather: number;
  access: number;
  general: number;
}

export const BASE_COUPLE_WEIGHTS: CoupleWeights = {
  shared: 0.35,
  satisfaction: 0.25,
  budget: 0.15,
  weather: 0.1,
  access: 0.1,
  general: 0.05,
};

/**
 * Adapt the base weighting to what the two actually answered
 * (non-negotiables, budget flexibility, travel-comfort sensitivity).
 */
export function adaptCoupleWeights(a: Profile, b: Profile): CoupleWeights {
  const w = { ...BASE_COUPLE_WEIGHTS };
  const musts = new Set([...a.musts, ...b.musts]);
  if (musts.has("warm")) w.weather *= 1.4;
  if (musts.has("value")) w.budget *= 1.25;
  if (a.budget.stretch && b.budget.stretch) w.budget *= 0.8;
  w.access *= (a.accessImportance + b.accessImportance) / 2;
  if (musts.has("transfer")) w.access *= 1.2;
  const sum = Object.values(w).reduce((s, x) => s + x, 0);
  return {
    shared: w.shared / sum,
    satisfaction: w.satisfaction / sum,
    budget: w.budget / sum,
    weather: w.weather / sum,
    access: w.access / sum,
    general: w.general / sum,
  };
}

/** Elementwise minimum of both share vectors (what BOTH care about), renormalised. */
export function sharedShare(a: Profile, b: Profile): Vec {
  const out = {} as Vec;
  let sum = 0;
  for (const k of DIMS) {
    out[k] = Math.min(a.share[k], b.share[k]);
    sum += out[k];
  }
  for (const k of DIMS) out[k] = sum ? out[k] / sum : 0;
  return out;
}

export function jointBudget(a: Profile, b: Profile): { lo: number; hi: number } {
  const lo = Math.max(a.budget.lo, b.budget.lo);
  const hi = Math.min(a.budget.hi, b.budget.hi);
  if (lo <= hi) return { lo, hi };
  return { lo: (a.budget.lo + b.budget.lo) / 2, hi: (a.budget.hi + b.budget.hi) / 2 };
}

export interface CoupleScore {
  id: string;
  raw: number;
  match: number;
  parts: { shared: number; satisfaction: number; budget: number; weather: number; access: number; general: number };
  penalty: number;
  a: IndividualScore;
  b: IndividualScore;
}

/**
 * Raw score → displayed "Couple Match" percentage. Deliberately no cosmetic
 * inflation: the percentage is the weighted score itself (capped at 99 %,
 * because no place is perfect in every dimension).
 */
export function toMatchPercent(raw: number): number {
  return Math.round(clamp(raw, 1, 99));
}

export function scoreCouple(a: Profile, b: Profile, d: Destination, ctx: { shared: Vec; weights: CoupleWeights; budget: { lo: number; hi: number } }): CoupleScore {
  const sa = scoreIndividual(a, d);
  const sb = scoreIndividual(b, d);

  const commonWorlds = a.worlds.filter((w) => b.worlds.includes(w));
  const sharedWorld = commonWorlds.length ? worldBonus(commonWorlds, d, 14) : (worldBonus(a.worlds, d) + worldBonus(b.worlds, d)) / 4;
  const shared = clamp(prefFit(ctx.shared, d) + sharedWorld);

  const satisfaction = 0.55 * Math.min(sa.pref, sb.pref) + 0.45 * ((sa.pref + sb.pref) / 2);

  const stretch = a.budget.stretch && b.budget.stretch ? 180 : a.budget.stretch || b.budget.stretch ? 240 : 300;
  const budget = 0.75 * budgetScore(ctx.budget, stretch, d) + 0.25 * d.ratings.value;

  const weather = weatherScore(d).score;
  const access = 0.5 * accessScore(d) + 0.5 * Math.min(transferScore(a.transferTolMin, d), transferScore(b.transferTolMin, d));
  const general = generalSuitability(d);

  const w = ctx.weights;
  const base = w.shared * shared + w.satisfaction * satisfaction + w.budget * budget + w.weather * weather + w.access * access + w.general * general;

  // Non-negotiables of BOTH count (stronger than soft preferences), dealbreakers fully.
  const musts = mustPenalty(a.musts, d).penalty + mustPenalty(b.musts, d).penalty;
  const deal = dealbreakerPenalty(a, d) + dealbreakerPenalty(b, d);
  const style = (stylePenalty(a, d) + stylePenalty(b, d)) / 2;
  // A place that is great for only one of you must not win.
  const gap = Math.abs(sa.total - sb.total);
  const gapPenalty = gap > 10 ? (gap - 10) * 0.35 : 0;

  const penalty = musts * 0.8 + deal + style + gapPenalty;
  const raw = clamp(base - penalty);
  return {
    id: d.id,
    raw,
    match: toMatchPercent(raw),
    parts: { shared, satisfaction, budget, weather, access, general },
    penalty,
    a: sa,
    b: sb,
  };
}

export function topContributions(share: Vec, d: Destination, n = 4): { dim: Dim; value: number }[] {
  const f = destinationFeatures(d);
  return DIMS.filter((k) => f[k] >= 70)
    .map((k) => ({ dim: k, value: f[k], c: share[k] * f[k] }))
    .sort((x, y) => y.c - x.c)
    .slice(0, n)
    .map(({ dim, value }) => ({ dim, value }));
}
