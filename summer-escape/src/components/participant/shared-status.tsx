"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { LinkButton } from "@/components/ui";

/** Shows ONLY whether the shared result is available – never anything about the partner's progress. */
export function SharedStatus({ token, initialReady }: { token: string; initialReady: boolean }) {
  const [ready, setReady] = useState(initialReady);
  useEffect(() => {
    if (ready) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/p/${token}/status`, { cache: "no-store" });
        if (r.ok && (await r.json()).sharedReady) setReady(true);
      } catch {}
    }, 20_000);
    return () => clearInterval(t);
  }, [ready, token]);

  return (
    <motion.div layout className="overflow-hidden rounded-[2rem] bg-sea-deep p-7 text-ivory sm:p-10">
      <p className="eyebrow text-champagne">Our shared reveal</p>
      {ready ? (
        <>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            Your summer destination <span className="italic text-champagne">is waiting.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/75">Beide Perspektiven sind da. Nehmt euch einen Moment – am besten gemeinsam.</p>
          <LinkButton href={`/p/${token}/reveal`} variant="light" className="mt-8">
            Open the reveal
          </LinkButton>
        </>
      ) : (
        <>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            One more perspective <span className="italic text-champagne">is missing.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/75">
            Sobald beide Perspektiven vollständig sind, öffnet sich die gemeinsame Auswertung hier automatisch.
          </p>
          <div className="mt-8 flex items-center gap-3 text-ivory/60">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-champagne/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-champagne" />
            </span>
            <span className="text-xs uppercase tracking-[0.2em]">Waiting</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
