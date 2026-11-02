import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/config/env";

/**
 * Exchangeable AI provider layer. Currently: Anthropic Claude.
 * Returns null when no provider is configured — callers MUST then use a clearly
 * labelled demo path and never present simulated output as AI output.
 */
export interface CompleteInput {
  system: string;
  /** Plain text turns, or full content blocks (e.g. images / PDFs) for multimodal requests. */
  messages: Anthropic.Beta.Messages.BetaMessageParam[];
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** JSON schema for structured output. */
  schema?: Record<string, unknown>;
}

export class AiError extends Error {}

let client: Anthropic | null = null;
function getClient() {
  if (!env.anthropicApiKey) return null;
  client ??= new Anthropic({ apiKey: env.anthropicApiKey, maxRetries: 2, timeout: 120_000 });
  return client;
}

export function aiAvailable() {
  return env.aiMode === "anthropic";
}

export async function complete(input: CompleteInput): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.beta.messages.create({
      model: env.aiModel,
      max_tokens: input.maxTokens ?? 8000,
      system: input.system,
      messages: input.messages,
      output_config: {
        effort: input.effort ?? "medium",
        ...(input.schema ? { format: { type: "json_schema" as const, schema: input.schema } } : {}),
      },
      // Server-side refusal fallback (routes declined requests to an appropriate model).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (res.stop_reason === "refusal") {
      throw new AiError("ONE can't help with this request.");
    }
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    if (!text) throw new AiError("The AI returned an empty response. Please try again.");
    return text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AiError("ONE is busy right now. Please try again in a moment.");
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("The AI service is misconfigured (invalid API key).");
    if (e instanceof Anthropic.APIError) throw new AiError(`The AI service returned an error (${e.status ?? "network"}). Please try again.`);
    throw new AiError("The AI service could not be reached. Please try again.");
  }
}

export async function completeJson<T>(input: CompleteInput & { schema: Record<string, unknown> }): Promise<T | null> {
  const text = await complete(input);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError("The AI returned an unexpected format. Please try again.");
  }
}
