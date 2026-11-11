import { createHash } from "node:crypto";
import { EMBEDDING_DIMS } from "@/lib/db/migrations";

export interface Embedder {
  id: string; // stored in memories.embedding_model – vectors from different models are never compared
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Offline fallback: feature-hashing embedding over word unigrams/bigrams and character trigrams.
 * It is lexical, not truly semantic – good for typo-tolerant keyword recall, weaker for synonyms.
 * Honestly labelled as "local-hash-v1" so it is never mistaken for a neural embedding.
 */
export class LocalHashEmbedder implements Embedder {
  id = "local-hash-v1";
  async embed(texts: string[]) {
    return texts.map((t) => hashEmbed(t));
  }
}

export function hashEmbed(text: string, dims = EMBEDDING_DIMS): number[] {
  const v = new Float64Array(dims);
  const norm = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const words = norm.match(/[a-z0-9äöüß]+/g) ?? [];
  const add = (feature: string, weight: number) => {
    const h = createHash("md5").update(feature).digest();
    const idx = h.readUInt32LE(0) % dims;
    const sign = h[4] & 1 ? 1 : -1;
    v[idx] += sign * weight;
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (STOP.has(w)) continue;
    add("w:" + w, 1.0);
    if (i + 1 < words.length) add("b:" + w + "_" + words[i + 1], 0.5);
    const padded = `#${w}#`;
    for (let j = 0; j + 3 <= padded.length; j++) add("c:" + padded.slice(j, j + 3), 0.35);
  }
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

const STOP = new Set(
  "der die das und oder ein eine einer eines ist sind war mit für von zu im in am an auf aus bei den dem des ich du er sie es wir ihr mein meine nicht auch als wie the a an and or of to in on for is are be with my i you it this that".split(" "),
);

export class OpenAIEmbedder implements Embedder {
  id = "openai:text-embedding-3-small@256";
  async embed(texts: string[]) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI(); // reads OPENAI_API_KEY server-side
    const res = await client.embeddings.create({ model: "text-embedding-3-small", input: texts, dimensions: EMBEDDING_DIMS });
    return res.data.map((d) => d.embedding);
  }
}

export function getEmbedder(): Embedder {
  if (process.env.EMBEDDING_PROVIDER === "openai" && process.env.OPENAI_API_KEY) return new OpenAIEmbedder();
  return new LocalHashEmbedder();
}

export const toPgVector = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : "0")).join(",")}]`;

export function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
