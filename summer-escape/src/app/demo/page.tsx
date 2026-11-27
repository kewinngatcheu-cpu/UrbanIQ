import Image from "next/image";
import Link from "next/link";
import { DEMO_SCENARIOS } from "@/lib/demo";
import { imageUrl } from "@/lib/destinations/images";
import { FadeIn, LinkButton, Wordmark } from "@/components/ui";

export const metadata = { title: "Demo · Our Summer Escape 2027" };

const IMAGES = ["lindos", "dubrovnik", "narrowCove", "rivieraVillage", "overwater", "poolSeaView"];

export default function DemoIndex() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <span className="eyebrow !text-[0.58rem] text-sand-deep">Demo · Beispieldaten</span>
      </header>
      <FadeIn className="mt-14">
        <p className="eyebrow text-sand-deep">Preview mode</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-[1.02] sm:text-6xl">
          See the experience <span className="italic">before it’s real.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">
          Diese Demo arbeitet ausschließlich mit erfundenen Beispielprofilen. Es werden keine Antworten gespeichert. Die echte Umfrage startet
          erst, wenn sie im Admin-Bereich freigeschaltet wird.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/demo/survey">Fragebogen ausprobieren</LinkButton>
          <LinkButton href="/explore" variant="outline">
            Destination Atlas
          </LinkButton>
        </div>
      </FadeIn>

      <h2 className="mt-20 font-display text-3xl font-light">Test scenarios</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {DEMO_SCENARIOS.map((s, i) => (
          <FadeIn key={s.id} delay={(i % 2) * 0.08}>
            <Link href={`/demo/${s.id}`} className="group block overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-line transition hover:shadow-xl">
              <div className="relative aspect-[16/9]">
                <Image src={imageUrl(IMAGES[i % IMAGES.length], 900)} alt="" fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="eyebrow text-sand-deep">Szenario {String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-display text-2xl">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.description}</p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </main>
  );
}
