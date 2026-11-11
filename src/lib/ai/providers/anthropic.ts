import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { LLMProvider, StreamParams } from "../types";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

export const anthropicProvider: LLMProvider = {
  id: "anthropic",
  label: "Anthropic Claude",
  // Only an explicit JARVIS key counts – we never piggyback on ambient credentials.
  configured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  defaultModel: () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5",

  async stream(p: StreamParams, onDelta) {
    const model = p.model || this.defaultModel();
    const stream = getClient().beta.messages.stream(
      {
        model,
        max_tokens: p.maxTokens ?? 16000,
        system: p.system,
        messages: p.messages,
        thinking: { type: "adaptive" },
        output_config: { effort: p.effort ?? "medium" },
        // Server-side refusal fallback: if the model declines, the API re-runs on a suitable fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: p.signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") onDelta(event.delta.text);
    }
    const final = await stream.finalMessage();
    const text = final.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return {
      text,
      model: final.model,
      provider: "anthropic",
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
      stopReason: final.stop_reason ?? "unknown",
    };
  },

  async json({ system, prompt, schema, model }) {
    const res = await getClient().messages.parse({
      model: model || this.defaultModel(),
      max_tokens: 4000,
      system,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") return null;
    return (res.parsed_output as typeof schema._output | null) ?? null;
  },
};
