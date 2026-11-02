import "server-only";

/** Simple in-memory sliding-window limiter (per instance). Replace with Redis/Upstash for multi-instance deployments. */
const g = globalThis as unknown as { __oneRate?: Map<string, number[]> };
const buckets = (g.__oneRate ??= new Map());

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t: number) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
