"use client";

import Image from "next/image";
import clsx from "clsx";
import type { Option, Part } from "@/lib/survey/questions";
import { imageUrl } from "@/lib/destinations/images";
import { SLIDER_DEFAULTS, type AnswerField, type Answers } from "@/lib/survey/answers";

type Set = (field: string, value: unknown) => void;

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.7rem] transition-all duration-300",
        on ? "border-sea-deep bg-sea-deep text-ivory scale-100" : "border-ink/25 bg-white/70 text-transparent",
      )}
    >
      ✓
    </span>
  );
}

function ImageCard({ o, on, onClick, multi }: { o: Option; on: boolean; onClick: () => void; multi: boolean }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={on}
      onClick={onClick}
      className={clsx(
        "group relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-[1.4rem] text-left transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne",
        on ? "ring-[3px] ring-sea-deep ring-offset-2 ring-offset-ivory" : "ring-1 ring-line",
      )}
    >
      {o.image && (
        <Image
          src={imageUrl(o.image, 700)}
          alt=""
          fill
          sizes="(min-width: 768px) 25vw, 45vw"
          className={clsx("object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.22,1,.36,1)]", on ? "scale-105" : "group-hover:scale-105")}
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
      <span className="absolute right-3 top-3">
        <Check on={on} />
      </span>
      <span className="relative p-4 text-ivory">
        <span className="block font-display text-xl leading-tight sm:text-2xl">{o.label}</span>
        {o.hint && <span className="mt-1.5 block text-[0.72rem] leading-snug text-ivory/80">{o.hint}</span>}
      </span>
    </button>
  );
}

function ListOption({ o, on, onClick, multi }: { o: Option; on: boolean; onClick: () => void; multi: boolean }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={on}
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left text-[0.95rem] leading-snug transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne",
        on ? "border-sea-deep bg-sea-light/60 text-ink shadow-sm" : "border-line bg-white/60 hover:border-sand",
      )}
    >
      <Check on={on} />
      <span>{o.label}</span>
    </button>
  );
}

function QuoteOption({ o, on, onClick }: { o: Option; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={clsx(
        "relative w-full rounded-[1.4rem] border px-5 py-5 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne",
        on ? "border-sea-deep bg-sea-deep text-ivory shadow-lg" : "border-line bg-white/60 hover:border-sand",
      )}
    >
      <span className={clsx("font-display text-3xl leading-none", on ? "text-champagne" : "text-sand")}>“</span>
      <span className="mt-1 block font-display text-xl italic leading-snug">{o.label}</span>
    </button>
  );
}

function Chip({ o, on, onClick, disabled }: { o: Option; on: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={onClick}
      className={clsx(
        "rounded-full border px-4 py-2.5 text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne",
        on ? "border-sea-deep bg-sea-deep text-ivory" : "border-line bg-white/70 text-ink",
        disabled && !on && "opacity-40",
      )}
    >
      {on && <span className="mr-1.5">✓</span>}
      {o.label}
    </button>
  );
}

export function PartView({ part, answers, set }: { part: Part; answers: Answers; set: Set }) {
  const value = (answers as Record<string, unknown>)[part.field];

  if (part.kind === "single") {
    const pick = (k: string) => set(part.field, k);
    if (part.layout === "cards")
      return (
        <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {part.options.map((o) => (
            <ImageCard key={o.key} o={o} on={value === o.key} onClick={() => pick(o.key)} multi={false} />
          ))}
        </div>
      );
    if (part.layout === "quotes")
      return (
        <div role="radiogroup" className="grid gap-3">
          {part.options.map((o) => (
            <QuoteOption key={o.key} o={o} on={value === o.key} onClick={() => pick(o.key)} />
          ))}
        </div>
      );
    return (
      <div role="radiogroup" className="grid gap-2.5">
        {part.options.map((o) => (
          <ListOption key={o.key} o={o} on={value === o.key} onClick={() => pick(o.key)} multi={false} />
        ))}
      </div>
    );
  }

  if (part.kind === "multi") {
    const sel = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (k: string) => {
      if (sel.includes(k)) set(part.field, sel.filter((x) => x !== k));
      else if (part.max === 1) set(part.field, [k]);
      else if (sel.length < part.max) set(part.field, [...sel, k]);
    };
    const counter = (
      <p className="mb-3 text-xs text-ink-soft">
        {part.min === part.max ? `Genau ${part.max} auswählen` : part.min > 0 ? `${part.min}–${part.max} auswählen` : `Bis zu ${part.max} auswählen`}
        <span className="ml-2 font-semibold text-sea-deep">
          {sel.length}/{part.max}
        </span>
      </p>
    );
    if (part.layout === "cards")
      return (
        <div>
          {counter}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {part.options.map((o) => (
              <ImageCard key={o.key} o={o} on={sel.includes(o.key)} onClick={() => toggle(o.key)} multi />
            ))}
          </div>
        </div>
      );
    if (part.layout === "chips")
      return (
        <div>
          {counter}
          <div className="flex flex-wrap gap-2.5">
            {part.options.map((o) => (
              <Chip key={o.key} o={o} on={sel.includes(o.key)} onClick={() => toggle(o.key)} disabled={sel.length >= part.max} />
            ))}
          </div>
        </div>
      );
    return (
      <div>
        {counter}
        <div className="grid gap-2.5">
          {part.options.map((o) => (
            <ListOption key={o.key} o={o} on={sel.includes(o.key)} onClick={() => toggle(o.key)} multi />
          ))}
        </div>
      </div>
    );
  }

  if (part.kind === "slider") {
    const v = typeof value === "number" ? value : (SLIDER_DEFAULTS[part.field as AnswerField] ?? 5);
    const fill = ((v - part.min) / (part.max - part.min)) * 100;
    return (
      <div className="rounded-[1.4rem] border border-line bg-white/60 px-5 py-6">
        <div className="flex items-end justify-between gap-4">
          <label htmlFor={`s-${part.field}`} className="text-sm leading-snug text-ink-soft">
            {part.label}
          </label>
          <span className="font-display text-5xl font-light leading-none text-sea-deep tabular-nums">{v}</span>
        </div>
        <input
          id={`s-${part.field}`}
          type="range"
          className="se-range mt-4"
          min={part.min}
          max={part.max}
          step={1}
          value={v}
          style={{ ["--fill" as string]: `${fill}%` }}
          onChange={(e) => set(part.field, Number(e.target.value))}
          aria-valuetext={`${v} von ${part.max}`}
        />
        <div className="mt-1 flex justify-between gap-3 text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft">
          <span>
            {part.min} · {part.minLabel}
          </span>
          {part.midLabel && <span className="hidden text-center sm:block">5 · {part.midLabel}</span>}
          <span className="text-right">
            {part.maxLabel} · {part.max}
          </span>
        </div>
        {part.midLabel && <p className="mt-2 text-center text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft sm:hidden">5 · {part.midLabel}</p>}
      </div>
    );
  }

  if (part.kind === "pairs") {
    const cur = (value && typeof value === "object" ? value : {}) as Record<string, "a" | "b">;
    return (
      <div className="grid gap-5">
        {part.pairs.map((p, i) => (
          <div key={p.key} className="rounded-[1.4rem] border border-line bg-white/50 p-3">
            <p className="px-2 pb-2 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sand-deep">Entscheidung {i + 1}</p>
            <div role="radiogroup" className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
              {(["a", "b"] as const).map((side, idx) => (
                <ChoiceHalf key={side} label={side === "a" ? p.a : p.b} on={cur[p.key] === side} onClick={() => set(part.field, { ...cur, [p.key]: side })} order={idx} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (part.kind === "text") {
    const v = typeof value === "string" ? value : "";
    return (
      <div className="mt-2">
        <label htmlFor={`t-${part.field}`} className="text-sm text-ink-soft">
          {part.label} <span className="text-ink-soft/60">(optional, bleibt privat)</span>
        </label>
        <textarea
          id={`t-${part.field}`}
          value={v}
          maxLength={part.maxLength}
          placeholder={part.placeholder}
          onChange={(e) => set(part.field, e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-line bg-white/70 px-4 py-3 text-base outline-none transition focus:border-sea focus:ring-4 focus:ring-sea-light"
        />
        <p className="mt-1 text-right text-[0.7rem] text-ink-soft">
          {v.length}/{part.maxLength}
        </p>
      </div>
    );
  }
  return null;
}

function ChoiceHalf({ label, on, onClick, order }: { label: string; on: boolean; onClick: () => void; order: number }) {
  return (
    <>
      {order === 1 && <span className="self-center font-display text-lg italic text-sand">oder</span>}
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={onClick}
        className={clsx(
          "rounded-2xl px-3 py-4 text-left text-[0.88rem] leading-snug transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne",
          on ? "bg-sea-deep text-ivory shadow-md" : "bg-mist text-ink hover:bg-champagne/60",
        )}
      >
        {label}
      </button>
    </>
  );
}
