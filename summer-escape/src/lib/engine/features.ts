import type { Destination, Tag } from "../destinations/types";

/**
 * Preference dimensions. Each destination is described by a 0–100 value per
 * dimension (`destinationFeatures`), each person by an importance weight per
 * dimension (`profile.ts`).
 */
export const DIMS = [
  "beach",
  "water",
  "hotels",
  "pools",
  "romance",
  "evening",
  "food",
  "music",
  "calm",
  "uncrowded",
  "lively",
  "excursions",
  "value",
  "luxury",
  "youngCouples",
  "island",
  "city",
  "oldTown",
  "boatTrips",
  "beachClubs",
  "coves",
  "longBeach",
  "whiteSand",
  "sunsets",
  "photo",
  "promenade",
  "modern",
  "reef",
  "resort",
] as const;

export type Dim = (typeof DIMS)[number];
export type Vec = Record<Dim, number>;

export function zeroVec(): Vec {
  return Object.fromEntries(DIMS.map((d) => [d, 0])) as Vec;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const has = (d: Destination, t: Tag) => d.tags.includes(t);

const cache = new Map<string, Vec>();

/** Destination → feature vector (0–100 per dimension). */
export function destinationFeatures(d: Destination): Vec {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const r = d.ratings;
  const tag = (t: Tag, fallback: number) => (has(d, t) ? 100 : clamp(fallback));
  const costMid = (d.cost[0] + d.cost[1]) / 2;
  const v: Vec = {
    beach: r.beach,
    water: r.water,
    hotels: r.hotels,
    pools: r.pools,
    romance: r.romance,
    evening: r.evening,
    food: r.food,
    music: r.music,
    calm: r.calm,
    uncrowded: 100 - r.crowding,
    lively: clamp((r.evening + r.music + r.youngCouples) / 3 + (has(d, "lively") ? 8 : 0)),
    excursions: r.excursions,
    value: r.value,
    luxury: clamp(r.hotels * 0.75 + (has(d, "luxury") ? 25 : 0) + (costMid > 3000 ? 8 : 0) - 12),
    youngCouples: r.youngCouples,
    island: tag("island", 10),
    city: tag("city", 15),
    oldTown: tag("oldTown", 25),
    boatTrips: tag("boatTrips", r.excursions * 0.5),
    beachClubs: tag("beachClubs", r.music * 0.45),
    coves: tag("coves", r.beach * 0.4),
    longBeach: tag("longBeach", 30),
    whiteSand: tag("whiteSand", r.water * 0.5),
    sunsets: tag("sunsets", r.romance * 0.6),
    photo: tag("photo", (r.excursions + r.romance) * 0.3),
    promenade: tag("promenade", r.evening * 0.5),
    modern: tag("modern", 15),
    reef: tag("reef", r.water * 0.35),
    resort: tag("resort", r.pools * 0.5),
  };
  cache.set(d.id, v);
  return v;
}

/** Human labels for shared-preference highlights (English, editorial). */
export const DIM_HIGHLIGHT: Partial<Record<Dim, string>> = {
  beach: "Beautiful Beaches",
  water: "Crystal-Clear Water",
  hotels: "Stylish Hotels",
  pools: "Pool Days",
  romance: "Romantic Moments",
  evening: "Summer Nights",
  food: "Culinary Evenings",
  music: "Music & Golden Hour",
  calm: "Slow Mornings",
  uncrowded: "Away From the Crowds",
  lively: "Lively Coastal Towns",
  excursions: "Discovering Together",
  value: "Smart Value",
  luxury: "A Touch of Luxury",
  island: "Island Life",
  city: "Cosmopolitan City Vibes",
  oldTown: "Old-Town Strolls",
  boatTrips: "Days on a Boat",
  beachClubs: "Beach Club Afternoons",
  coves: "Secret Coves",
  whiteSand: "White Sand",
  sunsets: "Sunset Rituals",
  photo: "Picture-Perfect Places",
  promenade: "Seaside Promenades",
  modern: "Modern Architecture",
  reef: "Reefs & Snorkelling",
  resort: "Resort Comfort",
};

/** German labels for explanations ("Warum passt das Ziel?"). */
export const DIM_LABEL_DE: Record<Dim, string> = {
  beach: "Strandqualität",
  water: "Wasserqualität",
  hotels: "Hotelangebot",
  pools: "Hotels mit Pool",
  romance: "Romantik",
  evening: "Abendatmosphäre",
  food: "Restaurants & Kulinarik",
  music: "Musik & Unterhaltung",
  calm: "Ruhe & Erholung",
  uncrowded: "Wenig Massentourismus",
  lively: "Lebendige Atmosphäre",
  excursions: "Ausflugsmöglichkeiten",
  value: "Preis-Leistung",
  luxury: "Gehobenes Urlaubsgefühl",
  youngCouples: "Eignung für junge Paare",
  island: "Inselgefühl",
  city: "Stadtleben",
  oldTown: "Altstadt-Flair",
  boatTrips: "Bootsausflüge",
  beachClubs: "Beach Clubs",
  coves: "Versteckte Buchten",
  longBeach: "Lange Sandstrände",
  whiteSand: "Heller Sand & Türkis",
  sunsets: "Sonnenuntergänge",
  photo: "Fotospots",
  promenade: "Promenade",
  modern: "Moderne Architektur",
  reef: "Riffe & Schnorcheln",
  resort: "Resort-Komfort",
};
