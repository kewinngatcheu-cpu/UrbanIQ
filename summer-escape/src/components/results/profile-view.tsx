"use client";

import type { IndividualView } from "@/lib/engine/results";
import { FadeIn, LinkButton, Wordmark } from "@/components/ui";
import { DestinationCardView } from "./destination-card";
import { MapExplorer } from "@/components/map/map-explorer";

export function ProfileView({ view, name, token, backHref, demo }: { view: IndividualView; name: string; token?: string; backHref: string; demo?: boolean }) {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <span className="eyebrow !text-[0.58rem] text-ink-soft">{demo ? "Demo · Beispieldaten" : "Private · only for you"}</span>
      </header>
      <FadeIn className="mt-16">
        <p className="eyebrow text-sand-deep">Your private travel profile</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-[1.02] sm:text-6xl">
          {name}, these places <span className="italic">feel like you.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
          Deine drei individuell passendsten Reiseziele – berechnet nur aus deinen Antworten. Diese Seite ist ausschließlich über deinen
          persönlichen Link erreichbar und fließt nie sichtbar in die gemeinsame Auswertung ein.
        </p>
      </FadeIn>
      <div className="mt-14 grid gap-12">
        {view.top3.map((c, i) => (
          <FadeIn key={c.id}>
            <DestinationCardView c={c} index={i} label="Your match" token={token ?? ""} />
          </FadeIn>
        ))}
      </div>
      <section className="mt-24">
        <p className="eyebrow text-sand-deep">Your personal map</p>
        <h2 className="mt-4 font-display text-4xl font-light">Every destination, ranked for you.</h2>
        <div className="mt-8">
          <MapExplorer matches={view.matches} top={view.top3.map((c) => c.id)} matchLabel="Dein Match" />
        </div>
      </section>
      <div className="mt-16">
        <LinkButton href={backHref} variant="outline">
          ← Zurück
        </LinkButton>
      </div>
    </main>
  );
}
