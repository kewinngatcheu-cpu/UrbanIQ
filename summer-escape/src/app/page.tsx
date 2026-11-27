import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { imageUrl } from "@/lib/destinations/images";
import { DESTINATIONS } from "@/lib/destinations/data";
import { Divider, FadeIn, LinkButton } from "@/components/ui";
import { HeroMotion } from "@/components/landing/hero-motion";

/**
 * Landing page. The couple photos are read from /public/couple – the originals
 * are only cropped via CSS (object-fit), never altered. Without photos, two
 * travel mood images are shown instead (no artificial people, ever).
 */
function couplePhoto(file: string): string | null {
  return existsSync(path.join(process.cwd(), "public", "couple", file)) ? `/couple/${file}` : null;
}

export default function Landing() {
  const photo1 = couplePhoto("joanna-kewin-1.jpg");
  const photo2 = couplePhoto("joanna-kewin-2.jpg");
  const countries = new Set(DESTINATIONS.map((d) => d.country)).size;

  return (
    <main className="overflow-x-hidden">
      {/* ───────── HERO ───────── */}
      <section className="relative min-h-[100svh] bg-sea-deep text-ivory grain">
        <div className="absolute inset-0">
          <Image
            src={imageUrl("positanoNight", 2000)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sea-deep/70 via-sea-deep/35 to-sea-deep" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col px-5 pb-10 pt-8 sm:px-8">
          <header className="flex items-center justify-between">
            <span className="eyebrow !text-[0.6rem] text-ivory/80">Joanna × Kewin</span>
            <span className="eyebrow !text-[0.6rem] text-ivory/60">August 2027</span>
          </header>

          <HeroMotion>
            <div className="mt-14 grid flex-1 items-center gap-12 lg:mt-6 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <p className="eyebrow text-champagne">Two minds · Two perspectives · One summer</p>
                <h1 className="mt-6 font-display text-[3.4rem] font-light leading-[0.92] tracking-tight sm:text-7xl lg:text-[6.2rem]">
                  Our Summer
                  <br />
                  <span className="italic text-champagne">Escape</span>
                </h1>
                <div className="mt-5 flex items-baseline gap-4">
                  <span className="font-display text-4xl font-light sm:text-5xl">2027</span>
                  <span className="h-px w-16 bg-ivory/40" />
                  <span className="eyebrow !tracking-[0.4em] text-ivory/90">Joanna × Kewin</span>
                </div>
                <p className="mt-8 max-w-md font-display text-2xl italic leading-snug text-ivory/90 sm:text-[1.7rem]">
                  “One summer. Two perspectives. One unforgettable destination.”
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/70">
                  Let’s discover the place where our summer becomes a memory.
                </p>
                <div className="mt-10 flex flex-col items-start gap-5">
                  <LinkButton href="#how" variant="light">
                    Discover our summer
                  </LinkButton>
                  <p className="eyebrow !text-[0.62rem] text-ivory/70">15 Questions · 2 Perspectives · 3 Destinations</p>
                </div>
              </div>

              {/* Editorial photo composition */}
              <div className="relative mx-auto h-[26rem] w-full max-w-sm sm:h-[32rem] lg:max-w-none">
                <figure className="absolute right-0 top-0 h-[78%] w-[72%] overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-ivory/20">
                  <Image
                    src={photo1 ?? imageUrl("oia", 1200)}
                    alt={photo1 ? "Joanna und Kewin" : "Sommerabend auf Santorini"}
                    fill
                    sizes="(min-width: 1024px) 30vw, 70vw"
                    className="object-cover"
                    style={{ objectPosition: "50% 35%" }}
                    priority
                  />
                </figure>
                <figure className="absolute bottom-0 left-0 h-[52%] w-[52%] overflow-hidden rounded-[1.6rem] border-[6px] border-sea-deep shadow-2xl">
                  <Image
                    src={photo2 ?? imageUrl("lindos", 900)}
                    alt={photo2 ? "Joanna und Kewin" : "Türkise Bucht im Mittelmeer"}
                    fill
                    sizes="(min-width: 1024px) 20vw, 50vw"
                    className="object-cover"
                    style={{ objectPosition: "50% 40%" }}
                  />
                </figure>
                <span className="absolute -left-1 top-8 rotate-[-6deg] font-display text-3xl italic text-champagne/90 sm:text-4xl">
                  J × K
                </span>
              </div>
            </div>
          </HeroMotion>

          <div className="mt-10 flex justify-center">
            <a href="#how" className="eyebrow !text-[0.58rem] text-ivory/60 transition hover:text-ivory" aria-label="Weiter nach unten">
              Scroll ↓
            </a>
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-24 sm:px-8 sm:py-32">
        <FadeIn>
          <p className="eyebrow text-sand-deep">Different dreams. Shared memories.</p>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-light leading-tight sm:text-6xl">
            Two perspectives. <span className="italic">Fifteen questions.</span> One unforgettable summer.
          </h2>
        </FadeIn>

        <div className="mt-16 grid gap-10 sm:grid-cols-3">
          {[
            ["01", "Your private link", "Ihr beantwortet die 15 Fragen jeweils für euch – ohne Registrierung und ohne Einblick in die Antworten des anderen."],
            ["02", "Your private profile", "Nach dem Abschicken siehst du deine persönlichen Top 3 – nur über deinen eigenen Link."],
            ["03", "Our shared reveal", "Erst wenn beide fertig sind, öffnet sich die gemeinsame Auswertung – nur mit zusammengefassten Ergebnissen."],
          ].map(([n, title, text], i) => (
            <FadeIn key={n} delay={i * 0.12}>
              <div className="border-t border-line pt-6">
                <span className="font-display text-5xl font-light italic text-sand">{n}</span>
                <h3 className="mt-4 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{text}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <Divider className="my-20" />

        <FadeIn>
          <div className="grid gap-10 sm:grid-cols-[1fr_1fr] sm:items-center">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
              <Image src={imageUrl("blueLagoon", 1200)} alt="Blaue Lagune mit Booten" fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover" />
            </div>
            <div>
              <p className="eyebrow text-sand-deep">Destination intelligence</p>
              <h3 className="mt-4 font-display text-4xl font-light leading-tight">
                {DESTINATIONS.length} destinations. {countries} countries. <span className="italic">One match.</span>
              </h3>
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                Von Ksamil bis Koh Samui, von der Costa Smeralda bis El Gouna: Jedes Ziel ist nach Strand, Wasser, Hotels, Romantik,
                Abendstimmung, Preis-Leistung, Augustwetter und Erreichbarkeit ab Berlin bewertet. Der Couple-Algorithmus sucht nicht
                den Durchschnitt – sondern den Ort, an dem ihr beide glücklich seid.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/explore" variant="outline">
                  Destination Atlas
                </LinkButton>
                <LinkButton href="/demo" variant="ghost">
                  Demo ansehen →
                </LinkButton>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="mt-24 rounded-[2rem] bg-mist px-6 py-12 text-center sm:px-12">
            <p className="font-display text-3xl font-light italic leading-snug sm:text-4xl">Let’s discover where our summer begins.</p>
            <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
              Ihr habt euren persönlichen Link bekommen? Öffnet ihn direkt – er führt euch in eure private Umfrage.
            </p>
          </div>
        </FadeIn>
      </section>

      <footer className="border-t border-line px-5 py-10 text-center">
        <p className="eyebrow !text-[0.58rem] text-ink-soft">Our Summer Escape 2027 · Joanna × Kewin</p>
        <p className="mt-2 text-[0.7rem] text-ink-soft/70">Fotos: Unsplash (Stimmungsbilder) · Karten: © OpenStreetMap, © CARTO</p>
      </footer>
    </main>
  );
}
