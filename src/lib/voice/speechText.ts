/**
 * Text preparation for speech output (shared by server and browser).
 * Removes markdown and code, turns list structure into pauses, and splits text into sentence chunks
 * so playback can start after the first sentence instead of waiting for the full answer.
 */

export function toSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " (Codeblock ausgelassen.) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\((?:https?:)?[^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "Link")
    .replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, "$1.")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*(\d+)\.\s+/gm, "$1: ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*\s][^*]*)\*/g, "$1$2")
    .replace(/(^|\s)_([^_]+)_/g, "$1$2")
    .replace(/[|>#*_~]/g, " ")
    .replace(/\s*→\s*/g, ", dann ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/(\S)\n+(?=\S)/g, (_m, c: string) => (/[.!?:;,]/.test(c) ? `${c} ` : `${c}. `))
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Split into speakable chunks at sentence ends. Very short sentences are merged so that
 * every chunk is ≥ minLen chars (fewer TTS requests, more natural prosody).
 * German abbreviations like "z. B.", "ca.", "Nr." and decimal numbers do not end a sentence.
 */
export function splitSentences(text: string, minLen = 40): string[] {
  const protectedText = text
    .replace(/\b(z\.\s?B|u\.\s?a|d\.\s?h|ca|bzw|Nr|evtl|ggf|inkl|vgl|usw|etc|Dr|Prof|bspw|Mio|Mrd)\./g, (m) => m.replace(/\./g, "§"))
    .replace(/(\d)\.(\d)/g, "$1§$2");
  const raw = protectedText.match(/[^.!?]+(?:[.!?]+["“”»]?|$)/g) ?? [];
  const out: string[] = [];
  let buf = "";
  for (const r of raw) {
    const s = r.replace(/§/g, ".").trim();
    if (!s) continue;
    buf = buf ? `${buf} ${s}` : s;
    if (buf.length >= minLen) { out.push(buf); buf = ""; }
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Incremental splitter for streamed text: feed deltas, get back the sentences completed so far.
 * `flush()` returns whatever is left at the end of the stream.
 */
export class SentenceStream {
  private buf = "";
  constructor(private minLen = 40) {}
  push(delta: string): string[] {
    this.buf += delta;
    // Only cut at a sentence end that is followed by whitespace (the next sentence has started),
    // so "3.5" or "z. B." mid-stream are not split prematurely.
    const re = /[.!?]["“”»]?\s+/g;
    let last = -1;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.buf))) {
      const before = this.buf.slice(0, m.index + 1);
      if (/\b(z\.\s?B|u\.\s?a|d\.\s?h|ca|bzw|Nr|evtl|ggf|inkl|vgl|usw|etc|Dr|Prof|bspw|Mio|Mrd)\.$/.test(before)) continue;
      if (/(?:^|\s)\p{L}\.$/u.test(before)) continue; // single-letter abbreviation ("z." of "z. B.", initials)
      if (/\d\.$/.test(before) && /^\s*\d/.test(this.buf.slice(m.index + 1))) continue;
      if (m.index + m[0].length >= this.minLen && (last < 0 || m.index + m[0].length - last >= this.minLen)) last = m.index + m[0].length;
    }
    if (last < 0) return [];
    const ready = this.buf.slice(0, last);
    this.buf = this.buf.slice(last);
    return [ready.trim()].filter(Boolean);
  }
  flush(): string[] {
    const rest = this.buf.trim();
    this.buf = "";
    return rest ? [rest] : [];
  }
}
