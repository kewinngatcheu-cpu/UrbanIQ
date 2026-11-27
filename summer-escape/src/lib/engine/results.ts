import { DESTINATIONS, DESTINATION_BY_ID } from "../destinations/data";
import {
  accessScore,
  formatHours,
  formatMinutesRange,
  totalTravelHours,
  travelShareOfTrip,
  weatherScore,
} from "../destinations/derived";
import { imageCredit, imageUrl, IMAGES } from "../destinations/images";
import { DIRECT_FLIGHT_LABEL, type Continent, type Destination, type World } from "../destinations/types";
import type { Answers } from "../survey/answers";
import { compatibility, type Compatibility } from "./compat";
import { DIM_HIGHLIGHT, DIM_LABEL_DE, DIMS, type Dim } from "./features";
import { buildProfile, type Profile } from "./profile";
import {
  adaptCoupleWeights,
  jointBudget,
  scoreCouple,
  scoreIndividual,
  sharedShare,
  toMatchPercent,
  topContributions,
  type CoupleScore,
  type CoupleWeights,
} from "./score";

/* ───────────────────────── view models (safe to send to the client) ───────────────────────── */

export interface DestinationCard {
  id: string;
  name: string;
  country: string;
  continent: Continent;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  imageCredit: string;
  match: number;
  areas: string[];
  ratings: { beach: number; water: number; hotels: number; pools: number; evening: number; romance: number };
  weather: { score: number; tMax: number; sea: number | null; rainDays: number; notes: string[] };
  cost: [number, number];
  flight: { hours: string; total: string; direct: string; airport: string; shareOfTrip: number; access: number };
  transfer: { range: string; note?: string };
  highlights: string[];
  why: string[];
  caution?: string;
}

export interface CoupleView {
  shared: string[];
  compat: Compatibility;
  top3: DestinationCard[];
  wildcard: (DestinationCard & { reason: string }) | null;
  final: DestinationCard;
  excitement: string | null;
  weights: CoupleWeights;
  /** Couple match for every destination (map). */
  matches: Record<string, number>;
}

export interface IndividualView {
  top3: DestinationCard[];
  /** Personal match for every destination (private map). */
  matches: Record<string, number>;
}

/* ───────────────────────── helpers ───────────────────────── */

export function card(d: Destination, match: number, why: string[]): DestinationCard {
  const w = weatherScore(d);
  return {
    id: d.id,
    name: d.name,
    country: d.country,
    continent: d.continent,
    tagline: d.tagline,
    description: d.description,
    image: imageUrl(d.image, 1600),
    imageAlt: IMAGES[d.image]?.alt ?? d.name,
    imageCredit: imageCredit(d.image),
    match,
    areas: d.areas,
    ratings: {
      beach: d.ratings.beach,
      water: d.ratings.water,
      hotels: d.ratings.hotels,
      pools: d.ratings.pools,
      evening: d.ratings.evening,
      romance: d.ratings.romance,
    },
    weather: { score: w.score, tMax: d.climate.tMax, sea: d.climate.sea, rainDays: d.climate.rainDays, notes: w.reasons },
    cost: d.cost,
    flight: {
      hours: formatHours(d.travel.flightH),
      total: formatHours(totalTravelHours(d)),
      direct: DIRECT_FLIGHT_LABEL[d.travel.direct],
      airport: d.travel.airport,
      shareOfTrip: travelShareOfTrip(d),
      access: accessScore(d),
    },
    transfer: { range: formatMinutesRange(d.travel.transferMin), note: d.travel.transferNote },
    highlights: d.highlights,
    why,
    caution: d.caution,
  };
}

function whyLines(share: Record<Dim, number>, d: Destination, extra: string[] = []): string[] {
  const lines = topContributions(share, d, 4).map(({ dim, value }) => `${DIM_LABEL_DE[dim]} – ${value}/100`);
  return [...lines, ...extra];
}

const MED_WORLDS: World[] = ["greek", "italian", "adriatic", "french"];

/** Shared preference highlights – derived only from what BOTH weight above average. */
export function sharedHighlights(a: Profile, b: Profile, n = 6): string[] {
  const avg = 1 / DIMS.length;
  const cands = DIMS.filter((k) => DIM_HIGHLIGHT[k] && a.share[k] > avg * 1.15 && b.share[k] > avg * 1.15)
    .map((k) => ({ k, s: Math.min(a.share[k], b.share[k]) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => DIM_HIGHLIGHT[x.k] as string);
  const extra: string[] = [];
  const both = (ws: World[]) => a.worlds.some((w) => ws.includes(w)) && b.worlds.some((w) => ws.includes(w));
  if (both(MED_WORLDS)) extra.push("Mediterranean Lifestyle");
  if (both(["tropical", "asian"])) extra.push("Tropical Dreams");
  if (both(["arabian"])) extra.push("Arabian Nights");
  if (both(["northafrican"])) extra.push("Oriental Flair");
  return [...extra, ...cands].slice(0, n);
}

/* ───────────────────────── individual ───────────────────────── */

export function computeIndividual(answers: Answers): IndividualView {
  const p = buildProfile(answers);
  const scored = DESTINATIONS.map((d) => ({ d, s: scoreIndividual(p, d) })).sort((x, y) => y.s.total - x.s.total);
  const matches: Record<string, number> = {};
  for (const { d, s } of scored) matches[d.id] = toMatchPercent(s.total);
  const top3 = scored.slice(0, 3).map(({ d, s }) => {
    const extra = s.missedMusts.length ? [`Kompromiss bei: ${s.missedMusts.join(", ")}`] : [];
    return card(d, toMatchPercent(s.total), whyLines(p.share, d, extra));
  });
  return { top3, matches };
}

/* ───────────────────────── couple ───────────────────────── */

export function rankCouple(a: Profile, b: Profile): CoupleScore[] {
  const ctx = { shared: sharedShare(a, b), weights: adaptCoupleWeights(a, b), budget: jointBudget(a, b) };
  return DESTINATIONS.map((d) => scoreCouple(a, b, d, ctx)).sort((x, y) => y.raw - x.raw);
}

/**
 * The wildcard: a destination that was probably not on your radar – not a
 * "classic", not from a world either of you picked, and not on the same
 * continent as all of the top 3 – yet scoring highly for you both.
 */
export function pickWildcard(ranking: CoupleScore[], a: Profile, b: Profile): CoupleScore | null {
  const top3 = ranking.slice(0, 3).map((s) => DESTINATION_BY_ID[s.id]);
  const picked = new Set([...a.worlds, ...b.worlds]);
  const topContinents = new Set(top3.map((d) => d.continent));
  const topCountries = new Set(top3.map((d) => d.country));
  const candidates = ranking.slice(3, 30);
  const affinity = (d: Destination) => Math.max(0, ...[...picked].map((w) => d.worlds[w] ?? 0));
  const surprising = (s: CoupleScore, strict: boolean) => {
    const d = DESTINATION_BY_ID[s.id];
    if (d.classic || topCountries.has(d.country)) return false;
    if (strict) return affinity(d) < 0.6 || !topContinents.has(d.continent);
    return true;
  };
  return candidates.find((s) => surprising(s, true)) ?? candidates.find((s) => surprising(s, false)) ?? candidates[0] ?? null;
}

function wildcardReason(d: Destination, s: CoupleScore, ranking: CoupleScore[]): string {
  const rank = ranking.findIndex((x) => x.id === s.id) + 1;
  return `Platz ${rank} von ${ranking.length} in eurem gemeinsamen Ranking – ein Ziel, das ihr vermutlich nicht sofort auf dem Zettel hattet, das aber erstaunlich gut zu euren gemeinsamen Antworten passt.`;
}

function excitementLine(a: Profile, b: Profile): string | null {
  const lo = Math.min(a.excitement, b.excitement);
  if (lo >= 8) return "You're both counting the days.";
  if (lo >= 6) return "The excitement is real – on both sides.";
  return null;
}

export function computeCouple(answersA: Answers, answersB: Answers): CoupleView {
  const a = buildProfile(answersA);
  const b = buildProfile(answersB);
  const ranking = rankCouple(a, b);
  const shared = sharedShare(a, b);
  const weights = adaptCoupleWeights(a, b);

  const coupleWhy = (s: CoupleScore) => {
    const d = DESTINATION_BY_ID[s.id];
    const extra: string[] = [];
    const minSat = Math.min(s.a.pref, s.b.pref);
    if (minSat >= 70) extra.push("Für euch beide gleichermaßen stimmig");
    if (s.parts.budget >= 90) extra.push("Liegt im gemeinsamen Budgetrahmen");
    else if (s.parts.budget < 60) extra.push("Über eurem Budgetrahmen – der Mehrwert gleicht es teilweise aus");
    return whyLines(shared, d, extra);
  };

  const top3 = ranking.slice(0, 3).map((s) => card(DESTINATION_BY_ID[s.id], s.match, coupleWhy(s)));
  const wc = pickWildcard(ranking, a, b);
  const wildcard = wc
    ? { ...card(DESTINATION_BY_ID[wc.id], wc.match, coupleWhy(wc)), reason: wildcardReason(DESTINATION_BY_ID[wc.id], wc, ranking) }
    : null;
  const matches: Record<string, number> = {};
  for (const s of ranking) matches[s.id] = s.match;

  return {
    shared: sharedHighlights(a, b),
    compat: compatibility(a, b),
    top3,
    wildcard,
    final: top3[0],
    excitement: excitementLine(a, b),
    weights,
    matches,
  };
}
