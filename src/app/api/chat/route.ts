import { z } from "zod";
import { api, clientIp, HttpError, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/auth/rateLimit";
import { handleChat, type ChatEvent } from "@/lib/ai/chat";

export const runtime = "nodejs";
export const maxDuration = 300;

const body = z.object({
  conversationId: z.string().uuid().nullish(),
  workspaceId: z.string().min(1).max(64).default("personal"),
  message: z.string().min(1).max(20000),
  mode: z.enum(["text", "voice"]).default("text"),
});

/** Streams newline-delimited JSON events (see ChatEvent). */
export const POST = api(async (req) => {
  if (!rateLimit(`chat:${clientIp(req)}`, 30, 60_000).ok) throw new HttpError(429, "Zu viele Anfragen – kurz warten.");
  const input = body.parse(await readJson(req, 100_000));
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await handleChat({ ...input, signal: req.signal }, emit);
      } catch (e) {
        emit({ type: "error", code: "internal", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
});
