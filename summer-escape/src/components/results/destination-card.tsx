"use client";

import Image from "next/image";
import clsx from "clsx";
import type { DestinationCard } from "@/lib/engine/results";
import { formatEuro } from "@/lib/destinations/derived";
import { StatusBadge } from "@/components/ui";
import { LivePanel } from "./live-panel";

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.72rem] uppercase tracking-[0.12em] text-ink-soft">
        <span>{label}</span>
        <span className="font-semibold text-ink tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-[3px] rounded-full bg-line">
        <div className="h-full rounded-full bg-sea" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Fact({ label, children, status = "estimated" }: { label: string; children: React.ReactNode; status?: "estimated" | "verified" }) {
  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-sand-deep">{label}</p>
        <StatusBadge status={status} />
      </div>
      <div className="mt-1.5 text-sm leading-snug">{children}</div>
    </div>
  );
}

export function DestinationCardView({
  c,
  index,
  label = "Couple Match",
  token,
  compact = false,
}: {
  c: DestinationCard;
  index?: number;
  label?: string;
  token?: string;
  compact?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_80px_-40px_rgba(18,62,92,.35)] ring-1 ring-line">
      <div className={clsx("relative", compact ? "aspect-[16/10]" : "aspect-[4/5] sm:aspect-[16/10]")}>
        <Image src={c.image} alt={c.imageAlt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-ink/20" />
        <div className="absolute left-5 right-5 top-5 flex items-start justify-between">
          {index !== undefined ? <span className="eyebrow !text-[0.62rem] text-ivory/90">Destination {String(index + 1).padStart(2, "0")}</span> : <span />}
          <span className="rounded-full bg-ivory/90 px-3 py-1.5 text-center backdrop-blur">
            <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">{label}</span>
            <span className="block font-display text-2xl leading-none text-sea-deep tabular-nums">{c.match} %</span>
          </span>
        </div>
        <div className="absolute bottom-5 left-5 right-5 text-ivory">
          <h3 className="font-display text-4xl font-light uppercase leading-none tracking-wide sm:text-5xl">
            {c.name} <span className="text-champagne">– {c.country}</span>
          </h3>
          <p className="mt-3 max-w-xl font-display text-xl italic leading-snug text-ivory/90">“{c.tagline}”</p>
        </div>
        <span className="absolute bottom-1.5 right-3 text-[0.55rem] text-ivory/60">Stimmungsbild · Foto: {c.imageCredit} / Unsplash</span>
      </div>

      <div className="grid gap-8 p-5 sm:p-8">
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">{c.description}</p>

        {c.why.length > 0 && (
          <div>
            <p className="eyebrow text-sand-deep">Why it fits you</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.why.map((w) => (
                <li key={w} className="flex gap-2 text-sm">
                  <span className="text-sea">✦</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!compact && (
          <div>
            <p className="eyebrow text-sand-deep">What makes it special</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm">
                  <span className="text-sand-deep">—</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Meter label="Strand" value={c.ratings.beach} />
          <Meter label="Hotels & Pool" value={Math.round((c.ratings.hotels + c.ratings.pools) / 2)} />
          <Meter label="Abendstimmung" value={c.ratings.evening} />
        </div>

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Urlaubsregionen">{c.areas.join(" · ")}</Fact>
          <Fact label="Wetter im August">
            Ø {c.weather.tMax} °C{c.weather.sea !== null && ` · Meer ≈ ${c.weather.sea} °C`} · ≈ {c.weather.rainDays} Regentage
            <span className="mt-1 block text-xs text-ink-soft">
              Wetter-Score {c.weather.score}/100{c.weather.notes.length ? ` – ${c.weather.notes.join(", ")}` : ""}
            </span>
          </Fact>
          <Fact label="Geschätzte Kosten für zwei">
            <span className="font-display text-2xl">
              {formatEuro(c.cost[0])} – {formatEuro(c.cost[1])}
            </span>
            <span className="mt-1 block text-xs text-ink-soft">Flug ab BER + 7 Nächte 4★ mit Pool, August. Illustrative Schätzung – kein Angebot.</span>
          </Fact>
          <Fact label="Flugzeit ab Berlin">
            ca. {c.flight.hours} · {c.flight.direct}
            <span className="mt-1 block text-xs text-ink-soft">
              Gesamtanreise ca. {c.flight.total} · ≈ {c.flight.shareOfTrip} % der 7 Tage unterwegs (hin & zurück)
            </span>
          </Fact>
          <Fact label="Flughafentransfer">
            {c.flight.airport} → Hotel: {c.transfer.range}
            {c.transfer.note && <span className="mt-1 block text-xs text-ink-soft">{c.transfer.note}</span>}
          </Fact>
          <Fact label="Hotel- & Pool-Möglichkeiten">
            Hotelangebot {c.ratings.hotels}/100 · Poolhotels {c.ratings.pools}/100
          </Fact>
        </div>

        {c.caution && (
          <p className="rounded-2xl bg-champagne/40 px-4 py-3 text-[0.82rem] leading-relaxed">
            <strong className="font-semibold">Ehrlich gesagt: </strong>
            {c.caution}
          </p>
        )}

        {token !== undefined && !compact && <LivePanel destinationId={c.id} token={token} />}
      </div>
    </article>
  );
}
