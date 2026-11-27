import type { Dim } from "./features";
import type { Profile } from "./profile";

/**
 * Compatibility metrics (Part 2 of the reveal). Each metric compares the two
 * preference profiles inside one domain and returns 0–100. Only these
 * aggregated percentages are ever shown – never the underlying answers.
 */

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** 1 − total-variation distance of two weight sub-vectors (each renormalised). */
function domainSimilarity(a: Profile, b: Profile, dims: Dim[]): number {
  const sa = dims.reduce((s, d) => s + a.weights[d], 0) || 1;
  const sb = dims.reduce((s, d) => s + b.weights[d], 0) || 1;
  let tv = 0;
  for (const d of dims) tv += Math.abs(a.weights[d] / sa - b.weights[d] / sb);
  return 1 - tv / 2;
}

/** Ratio of how strongly the domain matters overall to each person (intensity agreement). */
function intensitySimilarity(a: Profile, b: Profile, dims: Dim[]): number {
  const ia = dims.reduce((s, d) => s + a.share[d], 0);
  const ib = dims.reduce((s, d) => s + b.share[d], 0);
  const hi = Math.max(ia, ib);
  return hi ? Math.min(ia, ib) / hi : 1;
}

const slider = (x: number, y: number, range = 9) => 1 - Math.abs(x - y) / range;
const jaccard = (x: string[], y: string[]) => {
  if (!x.length && !y.length) return 1;
  const sx = new Set(x);
  const inter = y.filter((v) => sx.has(v)).length;
  return inter / new Set([...x, ...y]).size;
};
const same = (x?: string, y?: string) => (x && y && x === y ? 1 : 0);
const pairAgree = (a: Profile, b: Profile, key: string) => {
  const x = a.choices.compromises[key];
  const y = b.choices.compromises[key];
  return x && y ? (x === y ? 1 : 0) : 0.5;
};

/** Map a 0–1 similarity to a percentage; 0.2 similarity is already "completely different". */
const toPct = (x: number) => Math.round(6 + 0.94 * clamp(((x - 0.2) / 0.8) * 100));

export interface Compatibility {
  beach: number;
  hotel: number;
  nightlife: number;
  adventure: number;
  budget: number;
  relaxation: number;
  overall: number;
}

export function budgetOverlap(a: Profile, b: Profile): number {
  const lo = Math.max(a.budget.lo, b.budget.lo);
  const hi = Math.min(a.budget.hi, b.budget.hi);
  const union = Math.max(a.budget.hi, b.budget.hi) - Math.min(a.budget.lo, b.budget.lo);
  if (hi >= lo) {
    // Overlapping ranges: share of the union, lifted so that any overlap reads as compatible.
    return 0.6 + 0.4 * ((hi - lo) / (union || 1));
  }
  const gap = lo - hi;
  return Math.max(0.1, 0.55 - gap / 1200);
}

export function compatibility(a: Profile, b: Profile): Compatibility {
  const beachDims: Dim[] = ["beach", "water", "coves", "beachClubs", "longBeach", "whiteSand"];
  const hotelDims: Dim[] = ["hotels", "pools", "luxury", "resort"];
  const nightDims: Dim[] = ["evening", "music", "lively", "beachClubs", "promenade"];
  const advDims: Dim[] = ["excursions", "boatTrips", "photo", "oldTown", "reef"];
  const relaxDims: Dim[] = ["calm", "pools", "uncrowded"];

  const beach =
    0.45 * domainSimilarity(a, b, beachDims) +
    0.2 * intensitySimilarity(a, b, beachDims) +
    0.2 * slider(a.beachImportance, b.beachImportance) +
    0.15 * (same(a.choices.beach, b.choices.beach) || 0.4);

  const hotel =
    0.4 * domainSimilarity(a, b, hotelDims) +
    0.2 * intensitySimilarity(a, b, hotelDims) +
    0.2 * jaccard(a.choices.hotelCriteria, b.choices.hotelCriteria) +
    0.1 * (same(a.choices.hotel, b.choices.hotel) || 0.4) +
    0.1 * pairAgree(a, b, "c2");

  const nightlife =
    0.4 * domainSimilarity(a, b, nightDims) +
    0.25 * intensitySimilarity(a, b, nightDims) +
    0.2 * jaccard(a.choices.evenings, b.choices.evenings) +
    0.15 * pairAgree(a, b, "c3");

  const adventure =
    0.35 * domainSimilarity(a, b, advDims) +
    0.2 * intensitySimilarity(a, b, advDims) +
    0.45 * slider(a.exploration, b.exploration);

  const relaxation =
    0.35 * domainSimilarity(a, b, relaxDims) +
    0.25 * intensitySimilarity(a, b, relaxDims) +
    0.25 * slider(a.avoidCrowds, b.avoidCrowds) +
    0.15 * pairAgree(a, b, "c1");

  const budget = budgetOverlap(a, b) * 0.85 + 0.15 * pairAgree(a, b, "c5");

  const res = {
    beach: toPct(beach),
    hotel: toPct(hotel),
    nightlife: toPct(nightlife),
    adventure: toPct(adventure),
    // Budget similarity is already on an absolute scale (range overlap).
    budget: Math.round(clamp(budget * 100)),
    relaxation: toPct(relaxation),
  };
  const overall = Math.round((res.beach + res.hotel + res.nightlife + res.adventure + res.budget + res.relaxation) / 6);
  return { ...res, overall };
}
