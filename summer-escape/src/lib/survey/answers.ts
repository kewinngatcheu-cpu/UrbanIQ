import { QUESTIONS, type Part, type QuestionId } from "./questions";

/**
 * Answers are stored as a flat object keyed by the `field` of each question part.
 * Validation is driven by the question definitions, so the stored data can only
 * ever contain known keys with known option values.
 */
export interface Answers {
  vibes?: string[];
  beach?: string;
  beachImportance?: number;
  hotel?: string;
  hotelCriteria?: string[];
  atmosphere?: string;
  evenings?: string[];
  day?: string;
  exploration?: number;
  crowdVibe?: string;
  avoidCrowds?: number;
  transfer?: string;
  budget?: string;
  invest?: string[];
  worlds?: string[];
  details?: string[];
  compromises?: Partial<Record<"c1" | "c2" | "c3" | "c4" | "c5", "a" | "b">>;
  musts?: string[];
  avoid?: string;
  dream?: string;
  excitement?: number;
}

export type AnswerField = keyof Answers;

const PARTS: Part[] = QUESTIONS.flatMap((q) => q.parts);

/** Strip control characters and trim free text. */
function cleanText(s: string, max: number): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max).trim();
}

/**
 * Sanitise a (partial) draft coming from the client. Unknown fields and invalid
 * values are dropped silently; partial answers are allowed.
 */
export function sanitizeAnswers(input: unknown): Answers {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const part of PARTS) {
    const v = src[part.field];
    if (v === undefined || v === null) continue;
    switch (part.kind) {
      case "single": {
        if (typeof v === "string" && part.options.some((o) => o.key === v)) out[part.field] = v;
        break;
      }
      case "multi": {
        if (!Array.isArray(v)) break;
        const keys = [...new Set(v.filter((x): x is string => typeof x === "string" && part.options.some((o) => o.key === x)))];
        out[part.field] = keys.slice(0, part.max);
        break;
      }
      case "slider": {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) out[part.field] = Math.min(part.max, Math.max(part.min, Math.round(n)));
        break;
      }
      case "pairs": {
        if (typeof v !== "object" || Array.isArray(v)) break;
        const res: Record<string, "a" | "b"> = {};
        for (const p of part.pairs) {
          const c = (v as Record<string, unknown>)[p.key];
          if (c === "a" || c === "b") res[p.key] = c;
        }
        out[part.field] = res;
        break;
      }
      case "text": {
        if (typeof v === "string") out[part.field] = cleanText(v, part.maxLength);
        break;
      }
    }
  }
  return out as Answers;
}

function partComplete(part: Part, a: Answers): boolean {
  const v = (a as Record<string, unknown>)[part.field];
  switch (part.kind) {
    case "single":
      return typeof v === "string";
    case "multi":
      return Array.isArray(v) && v.length >= part.min && v.length <= part.max;
    case "slider":
      return typeof v === "number";
    case "pairs":
      return !!v && part.pairs.every((p) => (v as Record<string, unknown>)[p.key] === "a" || (v as Record<string, unknown>)[p.key] === "b");
    case "text":
      return true; // optional
  }
}

export function isQuestionComplete(id: QuestionId, a: Answers): boolean {
  const q = QUESTIONS.find((x) => x.id === id);
  return !!q && q.parts.every((p) => partComplete(p, a));
}

export function missingQuestions(a: Answers): QuestionId[] {
  return QUESTIONS.filter((q) => !q.parts.every((p) => partComplete(p, a))).map((q) => q.id);
}

export function completedCount(a: Answers): number {
  return QUESTIONS.length - missingQuestions(a).length;
}

/** Defaults shown for sliders before the user touches them (not stored until changed). */
export const SLIDER_DEFAULTS: Partial<Record<AnswerField, number>> = {
  beachImportance: 7,
  exploration: 5,
  avoidCrowds: 6,
  excitement: 8,
};
