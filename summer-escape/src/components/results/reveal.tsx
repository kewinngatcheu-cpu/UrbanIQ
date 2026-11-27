"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CoupleView } from "@/lib/engine/results";
import { Divider, FadeIn, Wordmark } from "@/components/ui";
import { DestinationCardView } from "./destination-card";
import { MapExplorer } from "@/components/map/map-explorer";

const COMPAT_LABELS: [keyof CoupleView["compat"], string][] = [
  ["beach", "Beach Compatibility"],
  ["hotel", "Hotel Compatibility"],
  ["nightlife", "Nightlife Compatibility"],
  ["adventure", "Adventure Compatibility"],
  ["budget", "Budget Compatibility"],
  ["relaxation", "Relaxation Compatibility"],
];

function SectionHead({ part, title, sub }: { part: string; title: React.ReactNode; sub?: string }) {
  return (
    <FadeIn>
      <p className="eyebrow text-sand-deep">{part}</p>
      <h2 className="mt-4 font-display text-4xl font-light leading-[1.05] sm:text-6xl">{title}</h2>
      {sub && <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">{sub}</p>}
    </FadeIn>
  );
}

function CompatBar({ label, value, i }: { label: string; value: number; i: number }) {
  const reduce = useReducedMotion();
  return (
    <FadeIn delay={i * 0.06}>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">{label}</span>
        <span className="font-display text-3xl font-light tabular-nums text-sea-deep">{value}%</span>
      </div>
      <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sand-deep via-sea to-sea-deep"
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </FadeIn>
  );
}

export function Reveal({ view, token, demoLabel }: { view: CoupleView; token?: string; demoLabel?: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const final = view.final;

  return (
    <main className="overflow-x-hidden">
      <AnimatePresence>
        {!open && (
          <motion.section
            key="gate"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sea-deep px-6 text-center text-ivory grain"
            exit={reduce ? undefined : { opacity: 0, scale: 1.04, filter: "blur(8px)" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4 }}>
              {demoLabel && <p className="eyebrow mb-6 text-champagne/80">Demo · Beispieldaten · {demoLabel}</p>}
              <p className="eyebrow text-champagne">Joanna × Kewin · August 2027</p>
              <h1 className="mt-6 font-display text-5xl font-light leading-[1.02] sm:text-7xl">
                Two perspectives
                <br />
                <span className="italic text-champagne">have become one.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-sm text-sm text-ivory/70">Nehmt euch einen ruhigen Moment. Am schönsten ist es gemeinsam.</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  window.scrollTo({ top: 0 });
                }}
                className="mt-12 rounded-full bg-ivory px-8 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-sea-deep shadow-2xl transition hover:scale-[1.02]"
              >
                Reveal our summer
              </button>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
        <Wordmark />
        {demoLabel ? <span className="eyebrow !text-[0.58rem] text-sand-deep">Beispieldaten</span> : <span className="eyebrow !text-[0.58rem] text-ink-soft">The Reveal</span>}
      </header>

      {/* PART 1 */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHead
          part="Part 1 · Two perspectives"
          title={
            <>
              What you <span className="italic">both</span> long for.
            </>
          }
          sub="Nur das, was euch beiden wichtig ist – zusammengefasst. Einzelne Antworten bleiben privat."
        />
        <div className="mt-12 flex flex-wrap gap-3">
          {view.shared.map((s, i) => (
            <FadeIn key={s} delay={i * 0.08} y={12}>
              <span className="inline-block rounded-full border border-sand bg-white/70 px-5 py-3 font-display text-xl italic sm:text-2xl">{s}</span>
            </FadeIn>
          ))}
        </div>
        {view.excitement && (
          <FadeIn>
            <p className="mt-10 font-display text-2xl italic text-sand-deep">{view.excitement}</p>
          </FadeIn>
        )}
      </section>

      {/* PART 2 */}
      <section className="bg-mist">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <SectionHead
            part="Part 2 · Our compatibility"
            title={
              <>
                {view.compat.overall}% <span className="italic">in sync.</span>
              </>
            }
            sub="Berechnet aus euren Antworten – je höher, desto ähnlicher sind eure Vorstellungen in diesem Bereich. Unterschiede sind gut: Der Algorithmus sucht gezielt Orte, die beides verbinden."
          />
          <div className="mt-12 grid gap-7 sm:grid-cols-2">
            {COMPAT_LABELS.map(([k, label], i) => (
              <CompatBar key={k} label={label} value={view.compat[k]} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* PART 3 */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHead
          part="Part 3 · Our top 3 destinations"
          title={
            <>
              Three places <span className="italic">made for you two.</span>
            </>
          }
          sub="Nicht einfach addiert: Ein Ziel gewinnt nur, wenn ihr beide dort glücklich sein könnt – inklusive Budget, Augustwetter und Anreise."
        />
        <div className="mt-14 grid gap-12">
          {view.top3.map((c, i) => (
            <FadeIn key={c.id}>
              <DestinationCardView c={c} index={i} token={token ?? ""} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* PART 4 */}
      {view.wildcard && (
        <section className="bg-sea-deep text-ivory">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
            <FadeIn>
              <p className="eyebrow text-champagne">Part 4 · The wildcard</p>
              <h2 className="mt-4 font-display text-4xl font-light leading-[1.05] sm:text-6xl">
                The <span className="italic text-champagne">unexpected</span> match.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ivory/70">{view.wildcard.reason}</p>
            </FadeIn>
            <FadeIn className="mt-12 text-ink">
              <DestinationCardView c={view.wildcard} token={token ?? ""} />
            </FadeIn>
          </div>
        </section>
      )}

      {/* PART 5 */}
      <section className="relative min-h-[100svh] overflow-hidden bg-ink text-ivory">
        <Image src={final.image} alt={final.imageAlt} fill sizes="100vw" className="object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/50" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-end px-5 pb-16 pt-24 sm:px-8 sm:pb-24">
          <FadeIn>
            <p className="eyebrow text-champagne">Part 5 · The final destination</p>
            <p className="mt-6 font-display text-3xl font-light italic sm:text-4xl">Maybe this is where our summer begins.</p>
            <h2 className="mt-6 font-display text-6xl font-light uppercase leading-[0.9] tracking-wide sm:text-8xl">{final.name}</h2>
            <p className="mt-3 eyebrow text-ivory/80">{final.country}</p>
            <div className="mt-8 flex items-center gap-6">
              <span className="font-display text-7xl font-light text-champagne tabular-nums sm:text-8xl">{final.match}%</span>
              <span className="eyebrow max-w-[8rem] text-ivory/70">Couple match</span>
            </div>
            <p className="mt-8 max-w-xl text-[0.95rem] leading-relaxed text-ivory/85">{final.description}</p>
            <Divider className="mt-14 max-w-md !text-champagne/70 [&>span:first-child]:bg-ivory/20 [&>span:last-child]:bg-ivory/20" />
            <p className="mt-8 font-display text-2xl italic text-ivory/90 sm:text-3xl">One destination. Seven days. A lifetime of memories.</p>
            <span className="mt-6 block text-[0.6rem] text-ivory/50">Stimmungsbild · Foto: {final.imageCredit} / Unsplash</span>
          </FadeIn>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHead
          part="Destination map"
          title={
            <>
              Every option, <span className="italic">on one map.</span>
            </>
          }
          sub="Alle Destinationen mit eurem Couple Match. Filtert nach Kontinent, Budget, Strand, Augustwetter oder Match."
        />
        <div className="mt-10">
          <MapExplorer matches={view.matches} top={view.top3.map((c) => c.id)} wildcard={view.wildcard?.id} />
        </div>
        <details className="mt-16 rounded-2xl border border-line bg-white/50 p-5 text-sm text-ink-soft">
          <summary className="cursor-pointer font-semibold text-ink">Wie wurde gewichtet?</summary>
          <p className="mt-3 leading-relaxed">
            Gemeinsame Präferenzen {Math.round(view.weights.shared * 100)} % · Zufriedenheit beider {Math.round(view.weights.satisfaction * 100)} % ·
            Budget & Preis-Leistung {Math.round(view.weights.budget * 100)} % · Wetter im August {Math.round(view.weights.weather * 100)} % ·
            Erreichbarkeit {Math.round(view.weights.access * 100)} % · Allgemeine Eignung {Math.round(view.weights.general * 100)} %. Die Basisgewichtung
            (35/25/15/10/10/5) wird an eure Muss-Kriterien angepasst. Muss-Kriterien und Ausschlusswünsche beider fließen zusätzlich als Abzüge
            ein, ebenso große Zufriedenheitsunterschiede zwischen euch. Alle Destinationsdaten sind redaktionelle Schätzungen.
          </p>
        </details>
      </section>

      <footer className="border-t border-line px-5 py-10 text-center">
        <p className="font-display text-2xl italic">Different dreams. Shared memories.</p>
        <p className="eyebrow mt-3 !text-[0.58rem] text-ink-soft">Our Summer Escape 2027 · Joanna × Kewin</p>
      </footer>
    </main>
  );
}
