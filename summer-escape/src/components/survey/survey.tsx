"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import clsx from "clsx";
import { QUESTIONS, type Part } from "@/lib/survey/questions";
import { isQuestionComplete, missingQuestions, sanitizeAnswers, SLIDER_DEFAULTS, type AnswerField, type Answers } from "@/lib/survey/answers";
import { Button } from "@/components/ui";
import { PartView } from "./parts";

type SaveState = "idle" | "saving" | "saved" | "error" | "locked" | "paused";

export interface SurveyProps {
  mode: "live" | "demo";
  token?: string;
  name?: string;
  initial: Answers;
  onSubmitted: (answers: Answers) => void;
}

const TOTAL = QUESTIONS.length;
const REVIEW = TOTAL + 1;

function storageKey(mode: string, token?: string) {
  return `se-draft-${mode}-${token ? token.slice(0, 10) : "demo"}`;
}

function readLocal(key: string): Answers | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? sanitizeAnswers(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Untouched sliders count as "accepted default" when moving on. */
function withSliderDefaults(parts: Part[], a: Answers): Answers {
  const next = { ...a } as Record<string, unknown>;
  for (const p of parts) if (p.kind === "slider" && typeof next[p.field] !== "number") next[p.field] = SLIDER_DEFAULTS[p.field as AnswerField] ?? 5;
  return next as Answers;
}

function summary(qIndex: number, a: Answers): string {
  const q = QUESTIONS[qIndex];
  const bits: string[] = [];
  for (const p of q.parts) {
    const v = (a as Record<string, unknown>)[p.field];
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (p.kind === "single") bits.push(p.options.find((o) => o.key === v)?.label ?? "");
    if (p.kind === "multi") bits.push((v as string[]).map((k) => p.options.find((o) => o.key === k)?.label).join(", "));
    if (p.kind === "slider") bits.push(`${v}/10`);
    if (p.kind === "pairs") bits.push(`${Object.keys(v as object).length}/5 entschieden`);
    if (p.kind === "text" && v) bits.push(`„${String(v).slice(0, 40)}${String(v).length > 40 ? "…" : ""}“`);
  }
  return bits.filter(Boolean).join(" · ") || "—";
}

export function Survey({ mode, token, name, initial, onSubmitted }: SurveyProps) {
  const reduce = useReducedMotion();
  const key = storageKey(mode, token);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [save, setSave] = useState<SaveState>("idle");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore a local backup if the server has nothing yet (e.g. offline edits).
  useEffect(() => {
    const local = readLocal(key);
    if (local && Object.keys(initial).length === 0 && Object.keys(local).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      setAnswers(local);
      dirty.current = true;
    }
  }, [key, initial]);

  // Autosave: local backup immediately, server draft debounced.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch {
      /* storage may be unavailable (private mode) – server draft still works */
    }
    if (mode !== "live" || !token || !dirty.current) return;
    const t = setTimeout(async () => {
      setSave("saving");
      try {
        const res = await fetch(`/api/p/${token}/answers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setSave("saved");
        else if (data.error === "locked") setSave("locked");
        else if (data.error === "not_live") setSave("paused");
        else setSave("error");
      } catch {
        setSave("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [answers, key, mode, token]);

  const set = useCallback((field: string, value: unknown) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [field]: value }));
  }, []);

  const go = useCallback(
    (to: number) => {
      setDir(to > step ? 1 : -1);
      setStep(to);
      setError(null);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    },
    [step, reduce],
  );

  const q = step >= 1 && step <= TOTAL ? QUESTIONS[step - 1] : null;

  const next = () => {
    if (!q) return go(step + 1);
    const filled = withSliderDefaults(q.parts, answers);
    if (filled !== answers) {
      dirty.current = true;
      setAnswers(filled);
    }
    if (!isQuestionComplete(q.id, filled)) {
      setError("Bitte beantworte diese Frage vollständig, um weiterzugehen.");
      return;
    }
    go(step + 1);
  };

  const missing = useMemo(() => missingQuestions(answers), [answers]);
  const done = TOTAL - missing.length;
  const firstMissing = QUESTIONS.findIndex((x) => missing.includes(x.id));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "live" && token) {
        const res = await fetch(`/api/p/${token}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            data.error === "incomplete"
              ? "Es fehlen noch Antworten."
              : data.error === "locked"
                ? "Deine Antworten wurden bereits abgeschickt."
                : data.error === "not_live"
                  ? "Die Umfrage ist gerade pausiert."
                  : "Abschicken fehlgeschlagen – bitte nochmal versuchen.",
          );
          setSubmitting(false);
          setConfirming(false);
          return;
        }
      }
      try {
        localStorage.removeItem(key);
      } catch {}
      onSubmitted(answers);
    } catch {
      setError("Keine Verbindung – deine Antworten sind lokal gesichert. Bitte nochmal versuchen.");
      setSubmitting(false);
      setConfirming(false);
    }
  };

  const progress = step === 0 ? 0 : Math.min(1, (step - 1) / TOTAL + (q && isQuestionComplete(q.id, answers) ? 1 / TOTAL : 0));

  return (
    <div ref={topRef} className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-5 bg-ivory/90 px-5 pb-3 pt-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <span className="eyebrow !text-[0.6rem] text-ink-soft">
            {mode === "demo" ? "Demo · nichts wird gespeichert" : `Private survey${name ? ` · ${name}` : ""}`}
          </span>
          <span className="text-[0.7rem] text-ink-soft tabular-nums" aria-live="polite">
            {mode === "live" &&
              (save === "saving" ? "Speichert …" : save === "saved" ? "✓ Gespeichert" : save === "error" ? "Offline – lokal gesichert" : save === "paused" ? "Umfrage pausiert" : save === "locked" ? "Bereits abgeschickt" : "")}
          </span>
        </div>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <motion.div className="h-full bg-sea-deep" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
        </div>
      </div>

      <div className="flex-1 pb-36 pt-6">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <div className="pt-6">
                <p className="eyebrow text-sand-deep">Our Summer Escape 2027</p>
                <h1 className="mt-5 font-display text-5xl font-light leading-[1.02] sm:text-6xl">
                  {name ? (
                    <>
                      Hi {name}. <span className="italic">Let’s begin.</span>
                    </>
                  ) : (
                    <>
                      Fifteen questions. <span className="italic">One summer.</span>
                    </>
                  )}
                </h1>
                <p className="mt-6 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft">
                  Beantworte die 15 Fragen ganz ehrlich – so, wie <em>du</em> dir den Sommer wünschst. Deine Antworten bleiben privat:
                  Niemand sieht sie, auch nicht in der gemeinsamen Auswertung. {mode === "live" && "Alles wird automatisch gespeichert – du kannst jederzeit pausieren und später weitermachen."}
                </p>
                <ul className="mt-8 grid gap-3 text-sm text-ink-soft">
                  <li>✦ Ca. 6–8 Minuten</li>
                  <li>✦ Bis zum Abschicken jederzeit änderbar</li>
                  <li>✦ Danach siehst du deine persönlichen Top 3</li>
                </ul>
                {done > 0 && (
                  <p className="mt-8 rounded-2xl bg-mist px-4 py-3 text-sm">
                    Du hast bereits <strong>{done} von {TOTAL}</strong> Fragen beantwortet.
                  </p>
                )}
              </div>
            )}

            {q && (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-5xl font-light italic text-sand">{q.number}</span>
                  <span className="eyebrow text-sand-deep">{q.title}</span>
                </div>
                <h2 className="mt-4 font-display text-[2rem] font-light leading-[1.1] sm:text-[2.6rem]">{q.prompt}</h2>
                {q.note && <p className="mt-3 text-sm text-ink-soft">{q.note}</p>}
                <div className="mt-8 grid gap-8">
                  {q.parts.map((p) => (
                    <PartView key={p.field} part={p} answers={answers} set={set} />
                  ))}
                </div>
              </div>
            )}

            {step === REVIEW && (
              <div>
                <p className="eyebrow text-sand-deep">Almost there</p>
                <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
                  Your summer, <span className="italic">in your words.</span>
                </h2>
                <p className="mt-4 text-sm text-ink-soft">Prüfe deine Antworten. Nach dem Abschicken sind sie fixiert.</p>
                <ol className="mt-8 divide-y divide-line border-y border-line">
                  {QUESTIONS.map((x, i) => {
                    const ok = !missing.includes(x.id);
                    return (
                      <li key={x.id}>
                        <button type="button" onClick={() => go(i + 1)} className="flex w-full items-start gap-4 py-4 text-left">
                          <span className={clsx("font-display text-xl italic", ok ? "text-sand-deep" : "text-red-700")}>{x.number}</span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{x.title}</span>
                            <span className={clsx("mt-0.5 block text-[0.8rem] leading-snug", ok ? "text-ink-soft" : "text-red-700")}>
                              {ok ? summary(i, answers) : "Noch offen – tippen zum Beantworten"}
                            </span>
                          </span>
                          <span className="text-xs text-ink-soft">Ändern</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pt-3 sm:px-8">
          <Button variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0} aria-label="Zurück">
            ← Zurück
          </Button>
          <span className="text-[0.7rem] text-ink-soft tabular-nums">{q ? `${step} / ${TOTAL}` : step === REVIEW ? `${done} / ${TOTAL} ✓` : ""}</span>
          {step === 0 && <Button onClick={() => go(firstMissing >= 0 && done > 0 ? firstMissing + 1 : 1)}>{done > 0 ? "Weiter" : "Start"}</Button>}
          {q && <Button onClick={next}>{step === TOTAL ? "Prüfen" : "Weiter"}</Button>}
          {step === REVIEW && (
            <Button onClick={() => (missing.length ? go(firstMissing + 1) : setConfirming(true))}>
              {missing.length ? "Fehlende Fragen" : "Abschicken"}
            </Button>
          )}
        </div>
      </nav>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-[1.8rem] bg-ivory p-7 shadow-2xl"
            >
              <p className="eyebrow text-sand-deep">Final step</p>
              <h3 id="confirm-title" className="mt-3 font-display text-3xl font-light">
                Ready to send your perspective?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Nach dem Abschicken können deine Antworten nicht mehr geändert werden. Sie bleiben privat – in der gemeinsamen Auswertung
                erscheinen nur zusammengefasste Ergebnisse.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
                <Button onClick={submit} disabled={submitting} className="flex-1">
                  {submitting ? "Wird gesendet …" : "Endgültig abschicken"}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting} className="flex-1">
                  Nochmal prüfen
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
