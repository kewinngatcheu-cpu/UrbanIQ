import { DESTINATIONS } from "@/lib/destinations/data";
import { MapExplorer } from "@/components/map/map-explorer";
import { FadeIn, LinkButton, Wordmark } from "@/components/ui";

export const metadata = { title: "Destination Atlas · Our Summer Escape 2027" };

export default function Explore() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <LinkButton href="/" variant="ghost">
          Home
        </LinkButton>
      </header>
      <FadeIn className="mt-14">
        <p className="eyebrow text-sand-deep">Destination Atlas</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-[1.02] sm:text-6xl">
          {DESTINATIONS.length} places <span className="italic">for one summer.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
          Alle Destinationen der Datenbank – filterbar nach Kontinent, Budget, Strandqualität und Augustwetter. Euren persönlichen Match seht
          ihr in eurem privaten Profil und in der gemeinsamen Auswertung. Alle Werte sind redaktionelle Schätzungen (kein Live-Angebot).
        </p>
      </FadeIn>
      <div className="mt-10">
        <MapExplorer />
      </div>
    </main>
  );
}
