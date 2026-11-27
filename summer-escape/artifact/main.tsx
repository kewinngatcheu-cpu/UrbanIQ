/**
 * Claude-Artifact version of OUR SUMMER ESCAPE 2027.
 * One shareable link. Identity = the viewer's Claude account, storage = the
 * artifact database:
 *   responses/<userId>  own answers   – readable by the person (and technically the owner), writable only by the person
 *   status/<userId>     {name, submitted} – visible to both, contains no answers
 *   shared/result       aggregated couple result – written by the owner's view once both submitted
 */
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useState } from "react";
import { Survey } from "@/components/survey/survey";
import { Reveal } from "@/components/results/reveal";
import { ProfileView } from "@/components/results/profile-view";
import { computeCouple, computeIndividual, type CoupleView } from "@/lib/engine/results";
import { sanitizeAnswers, type Answers } from "@/lib/survey/answers";
import { PERSONAS } from "@/lib/demo";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;
type Name = "Joanna" | "Kewin";
interface Status { name: Name; submitted: boolean }

const NAMES: Name[] = ["Joanna", "Kewin"];

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-5 py-16">{children}</main>;
}

function Brand() {
  return (
    <div className="mb-10">
      <p className="eyebrow !text-[0.6rem] text-sand-deep">Joanna × Kewin · August 2027</p>
      <h1 className="mt-4 font-display text-5xl font-light leading-[0.95]">
        Our Summer <span className="italic text-sea">Escape</span>
      </h1>
      <p className="mt-4 font-display text-xl italic text-ink-soft">“One summer. Two perspectives. One unforgettable destination.”</p>
    </div>
  );
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full bg-sea-deep px-7 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-ivory transition hover:bg-sea disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}

function App() {
  const [phase, setPhase] = useState<"loading" | "nodb" | "ready">("loading");
  const [db, setDb] = useState<Db>(null);
  const [me, setMe] = useState<string>("");
  const [owner, setOwner] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [mine, setMine] = useState<{ name?: Name; answers: Answers; submitted: boolean } | null>(null);
  const [result, setResult] = useState<CoupleView | null>(null);
  const [view, setView] = useState<"hub" | "survey" | "profile" | "reveal" | "demo">("hub");
  const [busy, setBusy] = useState(false);

  // Connect to the artifact runtime.
  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => !done && setPhase("nodb"), 12_000);
    (async () => {
      const c = (window as any).claude;
      if (!c?.use) return setPhase("nodb");
      const [d, u] = await Promise.all([c.use("db"), c.use("user")]);
      if (!d || !u) return setPhase("nodb");
      const id = await u.id();
      if (!id) return setPhase("nodb");
      setOwner((await u.isOwner()) ?? false);
      const own = await d.doc(`responses/${id}`).get().catch(() => null);
      const data = own?.exists ? own.data() : null;
      setMine({ name: data?.name, answers: sanitizeAnswers(data?.answers ?? {}), submitted: !!data?.submitted });
      setDb(d);
      setMe(id);
      done = true;
      clearTimeout(timer);
      setPhase("ready");
    })().catch(() => setPhase("nodb"));
    return () => clearTimeout(timer);
  }, []);

  // Live status + result.
  useEffect(() => {
    if (!db) return;
    const u1 = db.collection("status").onSnapshot((s: any) => {
      const m: Record<string, Status> = {};
      for (const d of s.docs) m[d.id] = d.data() as Status;
      setStatuses(m);
    });
    const u2 = db.doc("shared/result").onSnapshot((s: any) => setResult(s.exists ? (s.data().view as CoupleView) : null));
    return () => {
      u1?.();
      u2?.();
    };
  }, [db]);

  const both = Object.values(statuses).filter((s) => s.submitted);
  const sharedReady = both.length >= 2;

  // The owner's view computes the aggregated result once both have submitted.
  const computeShared = useCallback(async () => {
    if (!db || !owner || !sharedReady || result) return;
    const snap = await db.collection("responses").get().catch(() => null);
    if (!snap) return;
    const byName: Record<string, Answers> = {};
    for (const d of snap.docs) {
      const x = d.data();
      if (x?.submitted && x?.name) byName[x.name] = sanitizeAnswers(x.answers);
    }
    if (!byName.Joanna || !byName.Kewin) return;
    const v = computeCouple(byName.Joanna, byName.Kewin);
    await db.doc("shared/result").set({ view: JSON.parse(JSON.stringify(v)), at: new Date().toISOString() });
  }, [db, owner, sharedReady, result]);
  useEffect(() => {
    computeShared();
  }, [computeShared]);

  if (phase === "loading")
    return (
      <Shell>
        <Brand />
        <p className="text-sm text-ink-soft">Wird geladen …</p>
      </Shell>
    );

  if (view === "demo")
    return <Reveal view={computeCouple(PERSONAS.romanticLuxury.answers, PERSONAS.livelyExplorer.answers)} demoLabel="Romantik trifft Lebendigkeit" />;

  if (phase === "nodb" || !mine)
    return (
      <Shell>
        <Brand />
        <p className="text-sm leading-relaxed text-ink-soft">
          Bitte öffne diesen Link in claude.ai und melde dich an – nur so kann deine Umfrage privat gespeichert werden.
        </p>
        <button className="mt-8 text-left text-xs uppercase tracking-[0.2em] text-sea underline" onClick={() => setView("demo")}>
          Demo mit Beispieldaten ansehen →
        </button>
      </Shell>
    );

  const saveDoc = async (answers: Answers, submitted: boolean) => {
    await db.doc(`responses/${me}`).set({ name: mine.name, answers, submitted, at: new Date().toISOString() });
    await db.doc(`status/${me}`).set({ name: mine.name, submitted });
    return true;
  };

  // 1 · Who are you?
  if (!mine.name) {
    const taken = new Set(Object.entries(statuses).filter(([id]) => id !== me).map(([, s]) => s.name));
    return (
      <Shell>
        <Brand />
        <p className="eyebrow text-sand-deep">Wer bist du?</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {NAMES.map((n) => (
            <button
              key={n}
              disabled={busy || taken.has(n)}
              onClick={async () => {
                setBusy(true);
                await db.doc(`responses/${me}`).set({ name: n, answers: {}, submitted: false });
                await db.doc(`status/${me}`).set({ name: n, submitted: false });
                setMine({ ...mine, name: n });
                setBusy(false);
              }}
              className="rounded-[1.4rem] border border-line bg-white/70 px-4 py-8 font-display text-3xl transition hover:border-sea disabled:opacity-30"
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs text-ink-soft">Deine Antworten bleiben privat. Die gemeinsame Auswertung zeigt nur zusammengefasste Ergebnisse.</p>
      </Shell>
    );
  }

  if (view === "survey" && !mine.submitted)
    return (
      <Survey
        mode="live"
        name={mine.name}
        initial={mine.answers}
        persist={{ saveDraft: (a) => saveDoc(a, false), submit: (a) => saveDoc(a, true) }}
        onSubmitted={(a) => {
          setMine({ ...mine, answers: a, submitted: true });
          setView("hub");
          window.scrollTo({ top: 0 });
        }}
      />
    );

  if (view === "profile" && mine.submitted)
    return (
      <div>
        <ProfileView view={computeIndividual(mine.answers)} name={mine.name} backHref="#" />
        <div className="mx-auto max-w-5xl px-5 pb-16">
          <Btn onClick={() => setView("hub")}>← Zurück</Btn>
        </div>
      </div>
    );

  if (view === "reveal" && result)
    return (
      <div>
        <Reveal view={result} />
        <div className="mx-auto max-w-5xl px-5 pb-16">
          <Btn onClick={() => setView("hub")}>← Zurück</Btn>
        </div>
      </div>
    );

  // Hub
  return (
    <Shell>
      <Brand />
      {!mine.submitted ? (
        <div>
          <p className="eyebrow text-sand-deep">Hi {mine.name}</p>
          <h2 className="mt-3 font-display text-3xl font-light">
            {Object.keys(mine.answers).length ? "Pick up where you left off." : "Two perspectives. Yours comes first."}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">15 Fragen · ca. 7 Minuten · bis zum Abschicken jederzeit änderbar. Alles wird automatisch gespeichert.</p>
          <Btn className="mt-8" onClick={() => { setView("survey"); window.scrollTo({ top: 0 }); }}>
            {Object.keys(mine.answers).length ? "Continue survey" : "Start the survey"}
          </Btn>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="rounded-[1.6rem] border border-line bg-white/60 p-6">
            <p className="eyebrow text-sand-deep">Only for you</p>
            <h2 className="mt-2 font-display text-2xl font-light">Thank you, {mine.name}. Your perspective is safe.</h2>
            <button className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sea underline" onClick={() => { setView("profile"); window.scrollTo({ top: 0 }); }}>
              See my private top 3 →
            </button>
          </div>
          <div className="rounded-[1.6rem] bg-sea-deep p-7 text-ivory">
            <p className="eyebrow text-champagne">Our shared reveal</p>
            {result ? (
              <>
                <h2 className="mt-3 font-display text-3xl font-light">
                  Your summer destination <span className="italic text-champagne">is waiting.</span>
                </h2>
                <button
                  className="mt-6 rounded-full bg-ivory px-7 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sea-deep"
                  onClick={() => { setView("reveal"); window.scrollTo({ top: 0 }); }}
                >
                  Open the reveal
                </button>
              </>
            ) : sharedReady ? (
              <>
                <h2 className="mt-3 font-display text-3xl font-light">Both perspectives are in.</h2>
                <p className="mt-3 text-sm text-ivory/75">Die Auswertung wird vorbereitet und erscheint hier, sobald Kewin die Seite öffnet.</p>
              </>
            ) : (
              <>
                <h2 className="mt-3 font-display text-3xl font-light">
                  One more perspective <span className="italic text-champagne">is missing.</span>
                </h2>
                <p className="mt-3 text-sm text-ivory/75">Sobald beide fertig sind, öffnet sich die gemeinsame Auswertung hier automatisch.</p>
              </>
            )}
          </div>
        </div>
      )}
      <button className="mt-12 text-left text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft underline" onClick={() => setView("demo")}>
        Demo mit Beispieldaten
      </button>
    </Shell>
  );
}

createRoot(document.getElementById("se-root")!).render(<App />);
