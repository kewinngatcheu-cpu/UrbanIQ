import type { Answers } from "../survey/answers";
import type { World } from "../destinations/types";
import { WORLDS } from "../destinations/types";
import { DIMS, zeroVec, type Dim, type Vec } from "./features";

/**
 * Answers → preference profile.
 *
 * Every person starts from the shared brief of the trip (sun, beaches, turquoise
 * water, pool hotels, romance, restaurants, evening atmosphere, a bit of music,
 * excursions, not overcrowded). Each answer then adds importance to dimensions.
 * The mapping table below is the single place where the "meaning" of answers is
 * defined – easy to audit and to tune.
 */

export interface Profile {
  /** Raw importance weights per dimension. */
  weights: Vec;
  /** Weights normalised to sum 1. */
  share: Vec;
  worlds: World[];
  budget: { lo: number; hi: number; stretch: boolean };
  transferTolMin: number;
  /** Multiplier for how much travel time matters (≈0.7–1.5). */
  accessImportance: number;
  exploration: number;
  avoidCrowds: number;
  beachImportance: number;
  musts: string[];
  dealbreakers: DealbreakerRule[];
  excitement: number;
  /** Raw choices that are needed for compatibility metrics. */
  choices: {
    hotel?: string;
    hotelCriteria: string[];
    evenings: string[];
    beach?: string;
    compromises: Partial<Record<string, "a" | "b">>;
    atmosphere?: string;
    day?: string;
    crowdVibe?: string;
  };
}

const BASE: Partial<Record<Dim, number>> = {
  beach: 1,
  water: 1,
  pools: 1,
  hotels: 0.8,
  romance: 1,
  food: 0.8,
  evening: 0.8,
  music: 0.4,
  beachClubs: 0.4,
  excursions: 0.7,
  uncrowded: 0.6,
  sunsets: 0.5,
  youngCouples: 0.6,
};

type Effect = Partial<Record<Dim, number>>;

const VIBES: Record<string, Effect> = {
  mediterranean: { water: 3, beach: 2, romance: 1, oldTown: 1, sunsets: 1 },
  luxury: { hotels: 3, pools: 3, food: 2, luxury: 3 },
  beach: { beach: 3, beachClubs: 2, music: 2, whiteSand: 1 },
  romantic: { romance: 3, sunsets: 2, food: 1, calm: 1 },
  explore: { excursions: 3, oldTown: 1, boatTrips: 1, photo: 1 },
  social: { lively: 3, food: 2, music: 2, youngCouples: 2 },
  relax: { calm: 3, pools: 2, uncrowded: 1 },
};
const BEACH: Record<string, Effect> = {
  whiteTurquoise: { water: 3, beach: 2, whiteSand: 2 },
  coves: { coves: 3, uncrowded: 1, water: 1 },
  club: { beachClubs: 3, music: 1, luxury: 1 },
  long: { longBeach: 3, beach: 1 },
  restaurants: { promenade: 2, food: 1, evening: 1 },
  variety: { excursions: 2, boatTrips: 1, coves: 1 },
};
const HOTEL: Record<string, Effect> = {
  boutique4: { hotels: 1, pools: 2, value: 1 },
  luxury5: { luxury: 3, hotels: 3 },
  beachfront: { beach: 1, pools: 1, hotels: 1 },
  romanticDesign: { romance: 2, luxury: 1, calm: 1 },
  relaxedModern: { pools: 1, calm: 1, hotels: 1 },
  bigResort: { resort: 3, pools: 1 },
};
const CRITERIA: Record<string, Effect> = {
  pool: { pools: 2 },
  beachNear: { beach: 1 },
  design: { luxury: 1 },
  breakfast: { hotels: 0.5 },
  seaView: { sunsets: 1, romance: 0.5 },
  clean: { hotels: 1 },
  service: { hotels: 1, luxury: 0.5 },
  location: { promenade: 1, food: 0.5 },
};
const ATMOSPHERE: Record<string, Effect> = {
  livelyTown: { promenade: 2, food: 2, lively: 2 },
  romanticVillage: { romance: 2, oldTown: 1, calm: 1 },
  exclusiveCoast: { luxury: 2, beachClubs: 2, hotels: 1 },
  island: { island: 3, excursions: 1, beach: 1 },
  historicCity: { oldTown: 3, food: 1 },
  modernIntl: { modern: 3, city: 2, luxury: 1 },
};
const EVENINGS: Record<string, Effect> = {
  dinnerSea: { romance: 2, food: 1, sunsets: 1 },
  rooftop: { modern: 1, lively: 1, music: 1 },
  beachBar: { beachClubs: 2, music: 2, sunsets: 1 },
  oldTown: { oldTown: 2, romance: 1 },
  promenade: { promenade: 2, lively: 1, food: 1 },
  cocktails: { luxury: 1, evening: 2 },
  liveMusic: { music: 2, evening: 1 },
  hotel: { calm: 2, pools: 1 },
};
const DAY: Record<string, Effect> = {
  classic: { beach: 1, food: 1, pools: 1, romance: 1 },
  poolClub: { pools: 2, beachClubs: 2, luxury: 1 },
  excursion: { excursions: 2, boatTrips: 1, romance: 1, coves: 1 },
  active: { lively: 2, music: 1, reef: 1, city: 1 },
  mix: { excursions: 1, lively: 1, calm: 0.5 },
};
const CROWD: Record<string, Effect> = {
  quietExclusive: { calm: 3, luxury: 1, uncrowded: 2 },
  relaxedRestaurants: { calm: 1, food: 2 },
  youngLively: { lively: 2, youngCouples: 2, uncrowded: 1 },
  touristVaried: { lively: 2, excursions: 1, value: 1 },
  mix: { coves: 1, lively: 1, calm: 1 },
};
const INVEST: Record<string, Effect> = {
  hotel: { hotels: 1.5, luxury: 1 },
  beach: { beach: 1, water: 1 },
  location: { promenade: 1, oldTown: 0.5 },
  restaurants: { food: 1.5 },
  excursions: { excursions: 1.5 },
  flight: {},
};
const DETAILS: Record<string, Effect> = {
  sunsets: { sunsets: 2 },
  pool: { pools: 2 },
  turquoise: { water: 2 },
  romanticRestaurants: { romance: 1, food: 1 },
  beachClubs: { beachClubs: 2 },
  music: { music: 1, evening: 1 },
  oldTowns: { oldTown: 2 },
  photoSpots: { photo: 2 },
  boatTrips: { boatTrips: 2 },
  stylishRoom: { luxury: 1, hotels: 1 },
  seaWalks: { promenade: 1, romance: 1 },
  culinary: { food: 2 },
};
const COMPROMISE: Record<string, { a: Effect; b: Effect }> = {
  c1: { a: { beach: 2, water: 1, calm: 1 }, b: { lively: 2, evening: 1 } },
  c2: { a: { luxury: 2, hotels: 1 }, b: { excursions: 2 } },
  c3: { a: { romance: 2, calm: 1 }, b: { lively: 2, youngCouples: 1 } },
  c4: { a: { island: 2 }, b: { city: 2, promenade: 1 } },
  c5: { a: { luxury: 1 }, b: { value: 2, excursions: 1 } },
};
const MUSTS: Record<string, Effect> = {
  warm: {},
  beach: { beach: 3 },
  water: { water: 3 },
  pool: { pools: 3 },
  transfer: {},
  food: { food: 3 },
  evening: { evening: 2, music: 1 },
  uncrowded: { uncrowded: 3 },
  romance: { romance: 3 },
  excursions: { excursions: 3 },
  value: { value: 3 },
};
const DREAM: Record<string, Effect> = {
  turquoise: { water: 2, sunsets: 2, romance: 1 },
  luxury: { luxury: 2, pools: 2, food: 1 },
  explore: { excursions: 2, coves: 1, photo: 1 },
  lively: { beach: 1, lively: 2, food: 1, music: 1 },
  romantic: { romance: 2, calm: 2 },
  everything: { beach: 0.5, food: 0.5, romance: 0.5, excursions: 0.5, evening: 0.5, pools: 0.5 },
};

export const BUDGETS: Record<string, { lo: number; hi: number; stretch: boolean }> = {
  b1500: { lo: 1500, hi: 1800, stretch: false },
  b1800: { lo: 1800, hi: 2000, stretch: false },
  b2000: { lo: 2000, hi: 2250, stretch: false },
  b2250: { lo: 2250, hi: 2500, stretch: false },
  b2500: { lo: 2500, hi: 2800, stretch: false },
  b3000: { lo: 2500, hi: 3000, stretch: true },
};
/** Default when unanswered: the agreed frame of the trip (2.000–2.500 €). */
const DEFAULT_BUDGET = { lo: 2000, hi: 2500, stretch: false };

export const TRANSFER_TOL: Record<string, number> = { t30: 30, t60: 60, t90: 90, t120: 120, tAny: 210 };
const TRANSFER_IMPORTANCE: Record<string, number> = { t30: 1.35, t60: 1.15, t90: 1.0, t120: 0.85, tAny: 0.7 };

/** Keyword rules for the free-text "what I don't want to experience" field. */
export interface DealbreakerRule {
  id: "party" | "heat" | "rain" | "longTrip" | "crowds" | "massResort" | "coldWater" | "expensive" | "boring" | "dirty";
  label: string;
}

const DEALBREAKER_PATTERNS: { rule: DealbreakerRule; re: RegExp }[] = [
  { rule: { id: "party", label: "Party- und Cluburlaub" }, re: /party|ballermann|saufen|sauftour|disco|\bclubs?\b|malle|komasaufen|feierurlaub/ },
  { rule: { id: "heat", label: "Extreme Hitze" }, re: /hitze|hei(ß|ss)|zu warm|\bheat\b|schw(ü|ue)l|40 ?°|brutal warm/ },
  { rule: { id: "rain", label: "Regen & Monsun" }, re: /regen|monsun|unwetter|\brain\b|sturm|taifun|gewitter/ },
  { rule: { id: "longTrip", label: "Sehr lange Anreise" }, re: /lange?r? flu?g|langstrecke|umstieg|umsteig|zwischenstopp|long flight|jetlag|lange anreise|langer transfer|lange fahrt|ewig fahren/ },
  { rule: { id: "crowds", label: "Massentourismus" }, re: /massentouris|(ü|ue)berf(ü|ue)llt|menschenmassen|touristenmassen|\bcrowd|zu voll|alles voll|volle str(ä|ae)nde/ },
  { rule: { id: "massResort", label: "Bettenburgen" }, re: /bettenburg|all[- ]?inclusive|riesen ?resort|massenhotel|animation/ },
  { rule: { id: "coldWater", label: "Kaltes Wasser" }, re: /kalt(es)? (wasser|meer)|k(ü|ue)hles? (wasser|meer)|eiskalt/ },
  { rule: { id: "expensive", label: "Überteuerte Orte" }, re: /(ü|ue)berteuert|abzocke|zu teuer|wucher/ },
  { rule: { id: "boring", label: "Nichts los am Abend" }, re: /langweil|tote hose|nichts los|ausgestorben/ },
  { rule: { id: "dirty", label: "Unsaubere Strände" }, re: /dreck|schmutz|m(ü|ue)ll|unsauber|dreckig/ },
];

export function parseDealbreakers(text: string | undefined): DealbreakerRule[] {
  if (!text) return [];
  const t = text.toLowerCase();
  return DEALBREAKER_PATTERNS.filter((p) => p.re.test(t)).map((p) => p.rule);
}

function add(w: Vec, e: Effect | undefined, factor = 1) {
  if (!e) return;
  for (const k of Object.keys(e) as Dim[]) w[k] += (e[k] ?? 0) * factor;
}

export function buildProfile(a: Answers): Profile {
  const w = zeroVec();
  add(w, BASE);
  for (const v of a.vibes ?? []) add(w, VIBES[v]);
  add(w, BEACH[a.beach ?? ""]);
  add(w, HOTEL[a.hotel ?? ""]);
  for (const c of a.hotelCriteria ?? []) add(w, CRITERIA[c]);
  add(w, ATMOSPHERE[a.atmosphere ?? ""]);
  for (const e of a.evenings ?? []) add(w, EVENINGS[e], 0.8);
  add(w, DAY[a.day ?? ""]);
  add(w, CROWD[a.crowdVibe ?? ""]);
  for (const i of a.invest ?? []) add(w, INVEST[i]);
  for (const dt of a.details ?? []) add(w, DETAILS[dt]);
  for (const [k, choice] of Object.entries(a.compromises ?? {})) {
    const c = COMPROMISE[k];
    if (c && (choice === "a" || choice === "b")) add(w, c[choice]);
  }
  for (const m of a.musts ?? []) add(w, MUSTS[m]);
  add(w, DREAM[a.dream ?? ""]);

  // Sliders scale the relevant dimensions.
  const beachImportance = a.beachImportance ?? 7;
  const beachFactor = 0.4 + (beachImportance / 10) * 1.2; // 0.52 … 1.6
  w.beach *= beachFactor;
  w.water *= beachFactor;
  w.whiteSand *= beachFactor;
  w.coves *= beachFactor;

  const exploration = a.exploration ?? 5;
  w.excursions += Math.max(0, exploration - 3) * 0.5;
  w.boatTrips += Math.max(0, exploration - 5) * 0.2;
  if (exploration < 5) {
    w.calm += (5 - exploration) * 0.4;
    w.pools += (5 - exploration) * 0.3;
  }

  const avoidCrowds = a.avoidCrowds ?? 6;
  w.uncrowded += avoidCrowds * 0.35;

  const share = zeroVec();
  const sum = DIMS.reduce((s, d) => s + w[d], 0) || 1;
  for (const d of DIMS) share[d] = w[d] / sum;

  const budget = BUDGETS[a.budget ?? ""] ?? DEFAULT_BUDGET;
  const stretch = budget.stretch || a.compromises?.c5 === "a";
  let accessImportance = TRANSFER_IMPORTANCE[a.transfer ?? ""] ?? 1;
  if ((a.invest ?? []).includes("flight")) accessImportance += 0.2;
  if ((a.musts ?? []).includes("transfer")) accessImportance += 0.2;

  return {
    weights: w,
    share,
    worlds: (a.worlds ?? []).filter((x): x is World => (WORLDS as readonly string[]).includes(x)),
    budget: { ...budget, stretch },
    transferTolMin: TRANSFER_TOL[a.transfer ?? ""] ?? 90,
    accessImportance,
    exploration,
    avoidCrowds,
    beachImportance,
    musts: a.musts ?? [],
    dealbreakers: parseDealbreakers(a.avoid),
    excitement: a.excitement ?? 8,
    choices: {
      hotel: a.hotel,
      hotelCriteria: a.hotelCriteria ?? [],
      evenings: a.evenings ?? [],
      beach: a.beach,
      compromises: a.compromises ?? {},
      atmosphere: a.atmosphere,
      day: a.day,
      crowdVibe: a.crowdVibe,
    },
  };
}
