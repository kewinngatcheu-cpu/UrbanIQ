/**
 * Claude-Artifact version of OUR SUMMER ESCAPE 2027 – works WITHOUT login.
 * Everything stays on the person's own phone (localStorage). After submitting,
 * each person gets a "perspective code" (compressed + obfuscated answers) to send
 * to the partner. Pasting the partner's code unlocks the shared reveal locally.
 * The page never displays the partner's answers – only the aggregated result.
 */
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Survey } from "@/components/survey/survey";
import { Reveal } from "@/components/results/reveal";
import { ProfileView } from "@/components/results/profile-view";
import { computeCouple, computeIndividual } from "@/lib/engine/results";
import { missingQuestions, sanitizeAnswers, type Answers } from "@/lib/survey/answers";
import { PERSONAS } from "@/lib/demo";

type Name = "Joanna" | "Kewin";
interface State {
  name?: Name;
  answers: Answers;
  submitted: boolean;
  partner?: Answers;
}

const KEY = "se-artifact-v1";
const NAMES: Name[] = ["Joanna", "Kewin"];
const other = (n: Name): Name => (n === "Joanna" ? "Kewin" : "Joanna");

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s) return { ...s, answers: sanitizeAnswers(s.answers), partner: s.partner ? sanitizeAnswers(s.partner) : undefined };
  } catch {}
  return { answers: {}, submitted: false };
}
function store(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/* ── perspective code: JSON → deflate → xor → base64url ── */
const MASK = new TextEncoder().encode("our-summer-escape-2027-j-x-k");
const xor = (b: Uint8Array) => b.map((v, i) => v ^ MASK[i % MASK.length]);
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function pipe(data: Uint8Array, t: CompressionStream | DecompressionStream) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(t as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function encode(name: Name, answers: Answers): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ n: name, a: answers }));
  try {
    return "SE2." + b64(xor(await pipe(raw, new CompressionStream("deflate-raw"))));
  } catch {
    return "SE1." + b64(xor(raw));
  }
}
async function decode(code: string): Promise<{ n: Name; a: Answers } | null> {
  try {
    const c = code.trim().replace(/\s+/g, "");
    const [v, body] = [c.slice(0, 4), c.slice(4)];
    let bytes = xor(unb64(body));
    if (v === "SE2.") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (v !== "SE1.") return null;
    const j = JSON.parse(new TextDecoder().decode(bytes));
    if (!NAMES.includes(j.n)) return null;
    const a = sanitizeAnswers(j.a);
    return missingQuestions(a).length ? null : { n: j.n, a };
  } catch {
    return null;
  }
}

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
const btn = "rounded-full bg-sea-deep px-7 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-ivory transition hover:bg-sea disabled:opacity-40";
const back = (go: () => void) => (
  <div className="mx-auto max-w-5xl px-5 pb-16">
    <button className={btn} onClick={go}>
      ← Zurück
    </button>
  </div>
);

function App() {
  const [s, setS] = useState<State>(load);
  const [view, setView] = useState<"hub" | "survey" | "profile" | "reveal" | "demo">("hub");
  const [code, setCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const update = (n: State) => {
    setS(n);
    store(n);
  };
  const go = (v: typeof view) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  if (view === "demo")
    return (
      <div>
        <Reveal view={computeCouple(PERSONAS.romanticLuxury.answers, PERSONAS.livelyExplorer.answers)} demoLabel="Romantik trifft Lebendigkeit" />
        {back(() => go("hub"))}
      </div>
    );

  if (!s.name)
    return (
      <Shell>
        <Brand />
        <p className="eyebrow text-sand-deep">Wer bist du?</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {NAMES.map((n) => (
            <button key={n} onClick={() => update({ ...s, name: n })} className="rounded-[1.4rem] border border-line bg-white/70 px-4 py-8 font-display text-3xl transition hover:border-sea">
              {n}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-ink-soft">
          Keine Anmeldung nötig. Deine Antworten bleiben auf deinem Handy. Zum Schluss schickt ihr euch gegenseitig einen Code – die Seite zeigt daraus nur das gemeinsame Ergebnis, nie die Antworten des anderen.
        </p>
        <button className="mt-10 text-left text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft underline" onClick={() => go("demo")}>
          Demo mit Beispieldaten
        </button>
      </Shell>
    );

  const name = s.name;
  const partner = other(name);

  if (view === "survey" && !s.submitted)
    return (
      <main>
      <Survey
        mode="live"
        name={name}
        initial={s.answers}
        persist={{
          saveDraft: async (a) => {
            update({ ...s, answers: a });
            return true;
          },
          submit: async (a) => {
            update({ ...s, answers: a, submitted: true });
            return true;
          },
        }}
        onSubmitted={(a) => {
          update({ ...s, answers: a, submitted: true });
          go("hub");
        }}
      />
      </main>
    );

  if (view === "profile" && s.submitted)
    return (
      <div>
        <ProfileView view={computeIndividual(s.answers)} name={name} backHref="#" />
        {back(() => go("hub"))}
      </div>
    );

  if (view === "reveal" && s.submitted && s.partner) {
    const v = name === "Joanna" ? computeCouple(s.answers, s.partner) : computeCouple(s.partner, s.answers);
    return (
      <div>
        <Reveal view={v} />
        {back(() => go("hub"))}
      </div>
    );
  }

  const makeCode = async () => {
    const c = await encode(name, s.answers);
    setCode(c);
    return c;
  };
  const copy = async () => {
    const c = code || (await makeCode());
    try {
      await navigator.clipboard.writeText(c);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      (document.getElementById("se-code") as HTMLTextAreaElement | null)?.select();
    }
  };
  const addPartner = async () => {
    setErr(null);
    const d = await decode(input);
    if (!d) return setErr("Dieser Code ist ungültig oder unvollständig. Bitte den ganzen Code kopieren und einfügen.");
    if (d.n === name) return setErr(`Das ist dein eigener Code. Füge den Code von ${partner} ein.`);
    update({ ...s, partner: d.a });
    setInput("");
  };

  return (
    <Shell>
      <Brand />
      {!s.submitted ? (
        <div>
          <p className="eyebrow text-sand-deep">Hi {name}</p>
          <h2 className="mt-3 font-display text-3xl font-light">{Object.keys(s.answers).length ? "Pick up where you left off." : "Two perspectives. Yours comes first."}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">15 Fragen · ca. 7 Minuten · bis zum Abschicken jederzeit änderbar. Wird automatisch auf deinem Handy gespeichert.</p>
          <button className={`${btn} mt-8`} onClick={() => go("survey")}>
            {Object.keys(s.answers).length ? "Continue survey" : "Start the survey"}
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="rounded-[1.6rem] border border-line bg-white/60 p-6">
            <p className="eyebrow text-sand-deep">Only for you</p>
            <h2 className="mt-2 font-display text-2xl font-light">Thank you, {name}. Your perspective is safe.</h2>
            <button className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sea underline" onClick={() => go("profile")}>
              See my private top 3 →
            </button>
          </div>

          <div className="rounded-[1.6rem] border border-line bg-white/60 p-6">
            <p className="eyebrow text-sand-deep">Schritt 1 · Dein Code für {partner}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">Kopiere deinen Code und schick ihn {partner} (z. B. per WhatsApp). Er enthält deine Antworten verschlüsselt – die Seite zeigt sie niemandem an.</p>
            {code && (
              <textarea id="se-code" readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} className="mt-4 w-full resize-none rounded-xl border border-line bg-white px-3 py-2 font-mono text-[0.65rem] break-all" />
            )}
            <button className={`${btn} mt-4`} onClick={copy}>
              {copied ? "✓ Kopiert" : "Code kopieren"}
            </button>
          </div>

          {!s.partner ? (
            <div className="rounded-[1.6rem] bg-sea-deep p-6 text-ivory">
              <p className="eyebrow text-champagne">Schritt 2 · Code von {partner}</p>
              <h2 className="mt-2 font-display text-3xl font-light">
                One more perspective <span className="italic text-champagne">is missing.</span>
              </h2>
              <label htmlFor="se-partner" className="mt-4 block text-sm text-ivory/75">
                Sobald {partner} fertig ist und dir den Code schickt, hier einfügen:
              </label>
              <textarea id="se-partner" value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="SE2.…" className="mt-3 w-full resize-none rounded-xl bg-ivory px-3 py-2 font-mono text-[0.7rem] text-ink" />
              {err && <p className="mt-2 text-sm text-champagne">{err}</p>}
              <button className="mt-4 rounded-full bg-ivory px-7 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sea-deep disabled:opacity-40" disabled={!input.trim()} onClick={addPartner}>
                Auswertung freischalten
              </button>
            </div>
          ) : (
            <div className="rounded-[1.6rem] bg-sea-deep p-6 text-ivory">
              <p className="eyebrow text-champagne">Our shared reveal</p>
              <h2 className="mt-2 font-display text-3xl font-light">
                Your summer destination <span className="italic text-champagne">is waiting.</span>
              </h2>
              <button className="mt-6 rounded-full bg-ivory px-7 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sea-deep" onClick={() => go("reveal")}>
                Open the reveal
              </button>
            </div>
          )}
        </div>
      )}
      <button className="mt-12 text-left text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft underline" onClick={() => go("demo")}>
        Demo mit Beispieldaten
      </button>
    </Shell>
  );
}

createRoot(document.getElementById("se-root")!).render(<App />);
