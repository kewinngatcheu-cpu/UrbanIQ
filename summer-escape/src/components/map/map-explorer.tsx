"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { DESTINATIONS } from "@/lib/destinations/data";
import { CONTINENTS, type Continent } from "@/lib/destinations/types";
import { costMid, formatEuro, formatHours, totalTravelHours, weatherScore } from "@/lib/destinations/derived";
import type { MapPoint } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-ink-soft">Karte wird geladen …</div>,
});

type Opt<T> = { label: string; value: T };
function Select<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: Opt<T>[]; onChange: (v: T) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-sand-deep">{label}</span>
      <select
        value={String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value);
          if (o) onChange(o.value);
        }}
        className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-sea"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Interactive world map of all destinations with real filters. When match
 * values are provided (couple or private profile), the top destinations are
 * highlighted and the list can be filtered/sorted by match.
 */
export function MapExplorer({
  matches,
  top = [],
  wildcard,
  matchLabel = "Couple Match",
}: {
  matches?: Record<string, number>;
  top?: string[];
  wildcard?: string | null;
  matchLabel?: string;
}) {
  const [continent, setContinent] = useState<Continent | "all">("all");
  const [budget, setBudget] = useState<number>(0);
  const [beach, setBeach] = useState<number>(0);
  const [weather, setWeather] = useState<number>(0);
  const [minMatch, setMinMatch] = useState<number>(0);
  const [active, setActive] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      DESTINATIONS.map((d) => ({
        d,
        weather: weatherScore(d).score,
        cost: costMid(d),
        match: matches?.[d.id],
      }))
        .filter((r) => continent === "all" || r.d.continent === continent)
        .filter((r) => !budget || r.cost <= budget)
        .filter((r) => !beach || r.d.ratings.beach >= beach)
        .filter((r) => !weather || r.weather >= weather)
        .filter((r) => !minMatch || (r.match ?? 0) >= minMatch)
        .sort((a, b) => (matches ? (b.match ?? 0) - (a.match ?? 0) : a.d.name.localeCompare(b.d.name, "de"))),
    [continent, budget, beach, weather, minMatch, matches],
  );

  const points: MapPoint[] = rows.map(({ d, match, weather }) => ({
    id: d.id,
    name: d.name,
    country: d.country,
    lat: d.lat,
    lng: d.lng,
    match,
    rank: top.includes(d.id) ? "top" : wildcard === d.id ? "wildcard" : undefined,
    subtitle: `Strand ${d.ratings.beach} · August-Wetter ${weather} · ≈ ${formatEuro(costMid(d))} für zwei`,
  }));

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Select<Continent | "all">
          label="Kontinent"
          value={continent}
          onChange={setContinent}
          options={[{ label: "Alle", value: "all" }, ...CONTINENTS.map((c) => ({ label: c, value: c }))]}
        />
        <Select<number>
          label="Budget (Ø, zu zweit)"
          value={budget}
          onChange={setBudget}
          options={[
            { label: "Alle", value: 0 },
            { label: "bis 2.000 €", value: 2000 },
            { label: "bis 2.500 €", value: 2500 },
            { label: "bis 3.000 €", value: 3000 },
          ]}
        />
        <Select<number>
          label="Strandqualität"
          value={beach}
          onChange={setBeach}
          options={[
            { label: "Alle", value: 0 },
            { label: "ab 70", value: 70 },
            { label: "ab 80", value: 80 },
            { label: "ab 90", value: 90 },
          ]}
        />
        <Select<number>
          label="Wetter im August"
          value={weather}
          onChange={setWeather}
          options={[
            { label: "Alle", value: 0 },
            { label: "ab 60", value: 60 },
            { label: "ab 75", value: 75 },
            { label: "ab 90", value: 90 },
          ]}
        />
        {matches ? (
          <Select<number>
            label={matchLabel}
            value={minMatch}
            onChange={setMinMatch}
            options={[
              { label: "Alle", value: 0 },
              { label: "ab 60 %", value: 60 },
              { label: "ab 75 %", value: 75 },
              { label: "ab 85 %", value: 85 },
            ]}
          />
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>

      <div className="relative h-[58svh] min-h-80 overflow-hidden rounded-[1.6rem] ring-1 ring-line">
        <LeafletMap points={points} activeId={active} onSelect={setActive} />
      </div>
      <p className="text-xs text-ink-soft">
        {rows.length} von {DESTINATIONS.length} Destinationen · {top.length > 0 && "Dunkle Marker mit Zahl = eure Top 3, goldener Marker = Wildcard · "}
        Alle Werte geschätzt.
      </p>

      <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {rows.map(({ d, match, weather }) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setActive(d.id)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                active === d.id ? "border-sea-deep bg-sea-light/50" : "border-line bg-white/60 hover:border-sand",
              )}
            >
              <span className="flex-1">
                <span className="block font-display text-lg leading-tight">
                  {d.name}
                  {top.includes(d.id) && <span className="ml-2 text-xs text-sea">★ Top 3</span>}
                  {wildcard === d.id && <span className="ml-2 text-xs text-sand-deep">✦ Wildcard</span>}
                </span>
                <span className="block text-[0.72rem] text-ink-soft">
                  {d.country} · Strand {d.ratings.beach} · Wetter {weather} · {formatHours(totalTravelHours(d))} Anreise
                </span>
              </span>
              {match !== undefined && <span className="font-display text-xl text-sea-deep tabular-nums">{match}%</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
