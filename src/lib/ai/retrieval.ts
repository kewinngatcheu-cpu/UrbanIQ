/**
 * Lightweight lexical retrieval (BM25) over a user's own items.
 * Pure function — no I/O, safe to unit test. Callers must pass ONLY the current user's items.
 * Roadmap: replace/augment with pgvector embeddings in Supabase mode.
 */
export interface Doc {
  type: "memory" | "task" | "action" | "document";
  id: string;
  title: string;
  text: string;
  tags?: string[];
  date?: string;
}

const STOP = new Set(
  (
    "a an and are as at be but by for from has have i if in into is it its me my of on or our so that the their them then there these they this to was we were what when where which who why will with you your " +
    "about can do does did how any all not no yes please tell show find give need want get " +
    "der die das und oder ein eine einen einem einer ist sind war waren ich du er sie es wir ihr mein meine meinen mit von zu zum zur im in am an auf für bei aus als auch was wie wo wer wann warum nicht kein keine bitte habe hat haben"
  ).split(" "),
);

export function tokenize(s: string): string[] {
  return (s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9äöüß]{2,}/g) ?? [])
    .filter((t) => !STOP.has(t))
    .map(stem);
}

/** Very small suffix stripper (EN/DE) so "invoices" ~ "invoice", "rechnungen" ~ "rechnung". */
function stem(t: string): string {
  if (t.length > 5) {
    for (const suf of ["ungen", "ings", "ing", "ies", "en", "es", "er", "ed", "s", "n"]) {
      if (t.endsWith(suf) && t.length - suf.length >= 4) return t.slice(0, -suf.length);
    }
  } else if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1);
  return t;
}

export interface Scored<T extends Doc = Doc> {
  doc: T;
  score: number;
}

export function search<T extends Doc>(docs: T[], query: string, limit = 8): Scored<T>[] {
  const q = [...new Set(tokenize(query))];
  if (!q.length || !docs.length) return [];
  const toks = docs.map((d) => tokenize(`${d.title} ${d.title} ${(d.tags ?? []).join(" ")} ${d.text}`));
  const avg = toks.reduce((s, t) => s + t.length, 0) / toks.length || 1;
  const df = new Map<string, number>();
  for (const t of toks) for (const term of new Set(t)) df.set(term, (df.get(term) ?? 0) + 1);
  const N = docs.length, k1 = 1.4, b = 0.75;
  const out: Scored<T>[] = [];
  toks.forEach((t, i) => {
    const tf = new Map<string, number>();
    for (const term of t) tf.set(term, (tf.get(term) ?? 0) + 1);
    let score = 0;
    for (const term of q) {
      const f = tf.get(term) ?? 0;
      if (!f) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avg)));
    }
    if (score > 0) out.push({ doc: docs[i], score });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Related items by tag overlap + shared rare terms. */
export function related<T extends Doc>(target: T, docs: T[], limit = 4): Scored<T>[] {
  const others = docs.filter((d) => !(d.id === target.id && d.type === target.type));
  const tagSet = new Set((target.tags ?? []).map((t) => t.toLowerCase()));
  const lexical = search(others, `${target.title} ${target.text.slice(0, 600)}`, 20);
  const byKey = new Map<string, Scored<T>>();
  for (const s of lexical) byKey.set(`${s.doc.type}:${s.doc.id}`, { ...s });
  for (const d of others) {
    const overlap = (d.tags ?? []).filter((t) => tagSet.has(t.toLowerCase())).length;
    if (!overlap) continue;
    const key = `${d.type}:${d.id}`;
    const cur = byKey.get(key) ?? { doc: d, score: 0 };
    cur.score += overlap * 3;
    byKey.set(key, cur);
  }
  return [...byKey.values()].filter((s) => s.score >= 1.5).sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Extractive summary: picks the most representative sentences. Used in demo mode — clearly labelled. */
export function extractiveSummary(text: string, maxSentences = 3): string {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((s) => s.length > 20).slice(0, 80);
  if (sentences.length <= maxSentences) return sentences.join(" ") || text.slice(0, 280);
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) freq.set(t, (freq.get(t) ?? 0) + 1);
  const scored = sentences.map((s, i) => {
    const t = tokenize(s);
    const score = t.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.max(4, t.length) + (i === 0 ? 1 : 0);
    return { s, i, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, maxSentences).sort((a, b) => a.i - b.i).map((x) => x.s).join(" ");
}

export interface ExtractedTask {
  title: string;
  due: string | null; // ISO date (yyyy-mm-dd) or null
  kind: "task" | "deadline" | "appointment";
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, januar: 1, feb: 2, february: 2, februar: 2, mar: 3, march: 3, märz: 3, maerz: 3, apr: 4, april: 4, may: 5, mai: 5,
  jun: 6, june: 6, juni: 6, jul: 7, july: 7, juli: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, okt: 10, oktober: 10,
  nov: 11, november: 11, dec: 12, december: 12, dez: 12, dezember: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function findDate(line: string, now = new Date()): string | null {
  let m = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = line.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = line.match(/\b(\d{1,2})\.\s?(\d{1,2})\.(?!\d)/);
  if (m) return iso(now.getFullYear(), +m[2], +m[1]);
  m = line.match(/\b(\d{1,2})(?:st|nd|rd|th|\.)?\s+([A-Za-zäÄ]{3,9})\.?\s*(\d{4})?\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(m[3] ? +m[3] : now.getFullYear(), MONTHS[m[2].toLowerCase()], +m[1]);
  m = line.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(m[3] ? +m[3] : now.getFullYear(), MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

/** Heuristic task/deadline detection used in demo mode (labelled as such in the UI). */
export function heuristicTasks(text: string, now = new Date()): ExtractedTask[] {
  const out: ExtractedTask[] = [];
  const cue = /\b(todo|to do|to-do|must|need to|have to|should|please|remember to|deadline|due|until|by|frist|bis zum|bis|spätestens|muss|müssen|erledigen|zahlen|pay|call|anrufen|kündigen|cancel|send|senden|termin|appointment)\b/i;
  for (const raw of text.split(/\n|(?<=[.!?])\s+/)) {
    const line = raw.replace(/^\s*([-*•]|\d+[.)]|\[ ?\])\s*/, "").trim();
    if (line.length < 6 || line.length > 220) continue;
    const isChecklist = /^\s*([-*•]|\[ ?\])/.test(raw);
    const due = findDate(line, now);
    if (!(cue.test(line) || isChecklist || due)) continue;
    const kind = /\b(deadline|frist|due|spätestens|until|bis)\b/i.test(line) ? "deadline" : /\b(termin|appointment|meeting)\b/i.test(line) ? "appointment" : "task";
    out.push({ title: line.replace(/[.:]$/, ""), due, kind });
    if (out.length >= 12) break;
  }
  return out;
}
