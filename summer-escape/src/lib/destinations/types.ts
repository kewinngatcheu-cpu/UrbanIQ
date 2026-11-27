/**
 * Destination schema.
 *
 * All values in this database are editorial ESTIMATES based on general travel
 * knowledge and long-term climate normals – they are not live data. Every field
 * group therefore carries a data status (see `DataStatus`). Live values (prices,
 * flights, forecasts) are only shown when a live provider is connected and are
 * then stamped with the time of the query (see src/lib/live).
 */

export type DataStatus = "verified" | "estimated" | "unavailable";

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  verified: "Verifiziert",
  estimated: "Geschätzt",
  unavailable: "Noch nicht verfügbar",
};

/** The eight "worlds" of question 11 (moodboard). */
export const WORLDS = [
  "greek",
  "italian",
  "arabian",
  "tropical",
  "adriatic",
  "asian",
  "northafrican",
  "french",
] as const;
export type World = (typeof WORLDS)[number];

export type Continent = "Europa" | "Nordafrika" | "Naher Osten" | "Asien" | "Afrika & Indischer Ozean";

export const CONTINENTS: Continent[] = ["Europa", "Nordafrika", "Naher Osten", "Asien", "Afrika & Indischer Ozean"];

/** Editorial 0–100 ratings (higher = better), except `crowding` (higher = more crowded). */
export interface Ratings {
  beach: number;
  water: number;
  hotels: number;
  pools: number;
  romance: number;
  evening: number;
  food: number;
  music: number;
  calm: number;
  crowding: number;
  excursions: number;
  value: number;
  youngCouples: number;
}

export type ClimateFlag =
  | "meltemi" // strong summer north wind in the Aegean – refreshing but can stop boats
  | "monsoon" // SW monsoon: rain, rough sea, restricted boat trips
  | "typhoon" // typhoon season risk
  | "extremeHeat" // regularly 38 °C+
  | "humid"
  | "windy"
  | "winterSeason" // southern-hemisphere winter
  | "noBeach"; // city trip – sea temperature irrelevant

export interface Climate {
  /** Average daily maximum in August, °C (long-term normal, approximate). */
  tMax: number;
  /** Average number of rain days in August (approximate). */
  rainDays: number;
  /** Average sea surface temperature in August, °C – null for non-beach destinations. */
  sea: number | null;
  flags: ClimateFlag[];
}

export type DirectFlight = "common" | "seasonal" | "limited" | "none";

export const DIRECT_FLIGHT_LABEL: Record<DirectFlight, string> = {
  common: "Direktflüge ab BER üblich",
  seasonal: "Saisonale Direktflüge ab BER üblich",
  limited: "Direktflüge ab BER nur vereinzelt",
  none: "Keine Direktverbindung – mit Umstieg",
};

export interface Travel {
  /** Typical total flight time from Berlin incl. a usual connection, hours. */
  flightH: number;
  direct: DirectFlight;
  /** Arrival airport(s), IATA. */
  airport: string;
  /** Typical transfer from arrival airport to the hotel area, minutes [min, max]. */
  transferMin: [number, number];
  transferNote?: string;
}

export type Tag =
  | "island"
  | "city"
  | "oldTown"
  | "boatTrips"
  | "beachClubs"
  | "coves"
  | "longBeach"
  | "whiteSand"
  | "sunsets"
  | "photo"
  | "promenade"
  | "modern"
  | "rooftop"
  | "reef"
  | "surf"
  | "resort"
  | "allInclusive"
  | "luxury"
  | "partyHeavy"
  | "lively";

export interface Destination {
  id: string;
  name: string;
  country: string;
  continent: Continent;
  lat: number;
  lng: number;
  /** Short emotional English line used on cards. */
  tagline: string;
  /** German editorial description. */
  description: string;
  /** Concrete holiday areas / towns that fit a young couple. */
  areas: string[];
  ratings: Ratings;
  climate: Climate;
  travel: Travel;
  /** Estimated total for two: flights from BER + 7 nights 4★ hotel with pool, August. EUR [low, high]. */
  cost: [number, number];
  tags: Tag[];
  worlds: Partial<Record<World, number>>;
  highlights: string[];
  /** Honest caveats (weather, transfer, crowds, advisories). */
  caution?: string;
  /** Key into the image library. */
  image: string;
  /** Classic, "expected" summer destination – used to pick the wildcard. */
  classic: boolean;
  /** Data status per field group. */
  status: {
    ratings: DataStatus;
    climate: DataStatus;
    travel: DataStatus;
    cost: DataStatus;
  };
}
