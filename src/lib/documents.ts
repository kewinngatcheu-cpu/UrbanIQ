import "server-only";
import type { MemoryKind } from "@/lib/db/types";

export const ALLOWED_MIME: RegExp[] = [
  /^application\/pdf$/,
  /^text\/(plain|markdown|csv|html)$/,
  /^application\/json$/,
  /^image\/(png|jpe?g|webp|gif|heic)$/,
  /^audio\/(mpeg|mp4|x-m4a|m4a|wav|webm|ogg)$/,
];

export function kindForMime(mime: string): MemoryKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "voice";
  return "document";
}

const MAX_TEXT = 200_000;

export async function extractText(buf: Buffer, mime: string): Promise<{ text: string | null; status: "done" | "unsupported" | "failed" }> {
  try {
    if (mime === "application/pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await pdfText(pdf, { mergePages: true });
      const t = (Array.isArray(text) ? text.join("\n") : text).trim();
      return { text: t ? t.slice(0, MAX_TEXT) : null, status: t ? "done" : "unsupported" };
    }
    if (mime.startsWith("text/") || mime === "application/json") {
      let t = buf.toString("utf8");
      if (mime === "text/html") t = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
      return { text: t.slice(0, MAX_TEXT), status: "done" };
    }
    // Images (OCR) and audio (transcription) are prepared but not yet implemented — see ROADMAP.md.
    return { text: null, status: "unsupported" };
  } catch (e) {
    console.error("[documents] text extraction failed", e);
    return { text: null, status: "failed" };
  }
}
