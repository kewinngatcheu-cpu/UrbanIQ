import "server-only";
import type { Destination } from "../destinations/types";

/**
 * LIVE TRAVEL RESEARCH (optional).
 *
 * Strict separation:
 *  1. Destination rating   → src/lib/destinations (editorial, "estimated")
 *  2. Estimated budget     → Destination.cost (editorial, "estimated")
 *  3. Live research        → THIS module. Only real API responses, stamped with
 *                            the time of the query. Nothing is ever invented:
 *                            without a connected provider a section is returned
 *                            as `unavailable` with the reason.
 *
 * Connected out of the box (no key needed):
 *  - Climate: Open-Meteo Historical Weather API (August averages of the last 5 years)
 *  - Travel advisories: Auswärtiges Amt OpenData (German Foreign Office)
 * Prepared, require a contract/API key (see README):
 *  - Flights from BER, hotels with pool, transfers → FLIGHT_API_KEY / HOTEL_API_KEY
 */

export type LiveStatus = "live" | "unavailable" | "error";

export interface LiveSection<T> {
  status: LiveStatus;
  source: string;
  fetchedAt?: string;
  data?: T;
  message?: string;
}

export interface LiveResearch {
  destinationId: string;
  climate: LiveSection<{ years: string; avgMax: number; avgMin: number; rainDays: number; precipitationMm: number }>;
  advisory: LiveSection<{ country: string; warning: boolean; partialWarning: boolean; situationWarning: boolean; url: string }>;
  flights: LiveSection<never>;
  hotels: LiveSection<never>;
  transfers: LiveSection<never>;
}

const TIMEOUT_MS = 8000;
const CACHE_MS = 6 * 3600_000;
const cache = new Map<string, { at: number; value: LiveResearch }>();

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json", "User-Agent": "summer-escape-research/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function climate(d: Destination): Promise<LiveResearch["climate"]> {
  const source = "Open-Meteo Historical Weather API (open-meteo.com)";
  const now = new Date();
  const lastYear = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const years = [0, 1, 2, 3, 4].map((i) => lastYear - i);
  try {
    let maxSum = 0, minSum = 0, days = 0, rainDays = 0, precip = 0;
    for (const y of years) {
      const url =
        `https://archive-api.open-meteo.com/v1/archive?latitude=${d.lat}&longitude=${d.lng}` +
        `&start_date=${y}-08-01&end_date=${y}-08-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=UTC`;
      const j = (await getJson(url)) as { daily?: { temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[] } };
      const daily = j.daily;
      if (!daily) throw new Error("no daily data");
      daily.temperature_2m_max.forEach((v, i) => {
        const lo = daily.temperature_2m_min[i];
        const p = daily.precipitation_sum[i];
        if (v == null || lo == null) return;
        maxSum += v;
        minSum += lo;
        days++;
        if ((p ?? 0) >= 1) rainDays++;
        precip += p ?? 0;
      });
    }
    if (!days) throw new Error("empty");
    return {
      status: "live",
      source,
      fetchedAt: new Date().toISOString(),
      data: {
        years: `${years[years.length - 1]}–${years[0]}`,
        avgMax: Math.round((maxSum / days) * 10) / 10,
        avgMin: Math.round((minSum / days) * 10) / 10,
        rainDays: Math.round((rainDays / years.length) * 10) / 10,
        precipitationMm: Math.round(precip / years.length),
      },
    };
  } catch (e) {
    return { status: "error", source, message: `Abfrage fehlgeschlagen (${(e as Error).message}).` };
  }
}

/** German country names as used by the Foreign Office (best effort). */
const AA_NAMES: Record<string, string[]> = {
  VAE: ["Vereinigte Arabische Emirate"],
  Kroatien: ["Kroatien"],
  Griechenland: ["Griechenland"],
  Albanien: ["Albanien"],
  Montenegro: ["Montenegro"],
  Italien: ["Italien"],
  Spanien: ["Spanien"],
  Frankreich: ["Frankreich"],
  Türkei: ["Türkei"],
  Ägypten: ["Ägypten"],
  Marokko: ["Marokko"],
  Thailand: ["Thailand"],
  Malaysia: ["Malaysia"],
  China: ["China"],
  Malta: ["Malta"],
  Zypern: ["Zypern"],
  Portugal: ["Portugal"],
  Bulgarien: ["Bulgarien"],
  Tunesien: ["Tunesien"],
  Mauritius: ["Mauritius"],
  Malediven: ["Malediven"],
  Indonesien: ["Indonesien"],
  Tansania: ["Tansania"],
  "Sri Lanka": ["Sri Lanka"],
};

async function advisory(d: Destination): Promise<LiveResearch["advisory"]> {
  const source = "Auswärtiges Amt – OpenData Reise- und Sicherheitshinweise";
  try {
    const j = (await getJson("https://www.auswaertiges-amt.de/opendata/travelwarning")) as { response?: Record<string, unknown> };
    const entries = Object.entries(j.response ?? {}).filter(([k]) => k !== "lastModified" && k !== "contentList");
    const names = AA_NAMES[d.country] ?? [d.country];
    const hit = entries.find(([, v]) => {
      const c = v as { countryName?: string; title?: string };
      return names.some((n) => c.countryName === n || c.title?.startsWith(n));
    });
    if (!hit) return { status: "unavailable", source, message: "Land in den Open Data nicht gefunden – bitte direkt auf auswaertiges-amt.de prüfen." };
    const [id, v] = hit as [string, { countryName?: string; warning?: boolean; partialWarning?: boolean; situationWarning?: boolean }];
    return {
      status: "live",
      source,
      fetchedAt: new Date().toISOString(),
      data: {
        country: v.countryName ?? d.country,
        warning: !!v.warning,
        partialWarning: !!v.partialWarning,
        situationWarning: !!v.situationWarning,
        url: `https://www.auswaertiges-amt.de/de/service/laender/${id}`,
      },
    };
  } catch (e) {
    return { status: "error", source, message: `Abfrage fehlgeschlagen (${(e as Error).message}).` };
  }
}

function notConnected(kind: string, env: string): LiveSection<never> {
  return {
    status: "unavailable",
    source: "Kein Anbieter verbunden",
    message: `${kind}: Noch nicht verfügbar. Es werden bewusst keine Preise oder Verfügbarkeiten erfunden. Zum Aktivieren einen Anbieter anbinden (${env}, siehe README).`,
  };
}

export async function liveResearch(d: Destination): Promise<LiveResearch> {
  const hit = cache.get(d.id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const [c, a] = await Promise.all([climate(d), advisory(d)]);
  const value: LiveResearch = {
    destinationId: d.id,
    climate: c,
    advisory: a,
    flights: notConnected("Flugpreise & Flugzeiten ab BER", "FLIGHT_API_KEY"),
    hotels: notConnected("Hotelpreise & Hotels mit Pool", "HOTEL_API_KEY"),
    transfers: notConnected("Transferzeiten", "TRANSFER_API_KEY"),
  };
  cache.set(d.id, { at: Date.now(), value });
  return value;
}
