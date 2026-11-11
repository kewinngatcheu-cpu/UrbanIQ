import OpenAI from "openai";
import type { LLMProvider, StreamParams } from "../types";

let client: OpenAI | null = null;
const getClient = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

export const openaiProvider: LLMProvider = {
  id: "openai",
  label: "OpenAI",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  defaultModel: () => process.env.OPENAI_MODEL || "gpt-5",

  async stream(p: StreamParams, onDelta) {
    const model = p.model || this.defaultModel();
    const stream = await getClient().chat.completions.create(
      {
        model,
        stream: true,
        stream_options: { include_usage: true },
        messages: [{ role: "system", content: p.system }, ...p.messages],
      },
      { signal: p.signal },
    );
    let text = "";
    let stopReason = "unknown";
    let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
    let servedModel = model;
    for await (const chunk of stream) {
      servedModel = chunk.model || servedModel;
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) { text += delta; onDelta(delta); }
      if (chunk.choices[0]?.finish_reason) stopReason = chunk.choices[0].finish_reason === "stop" ? "end_turn" : chunk.choices[0].finish_reason;
      if (chunk.usage) usage = chunk.usage;
    }
    return { text, model: servedModel, provider: "openai", inputTokens: usage?.prompt_tokens, outputTokens: usage?.completion_tokens, stopReason };
  },

  async json({ system, prompt, schema, model }) {
    const res = await getClient().chat.completions.create({
      model: model || this.defaultModel(),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system + "\nAntworte ausschließlich mit einem JSON-Objekt." },
        { role: "user", content: prompt },
      ],
    });
    try {
      const parsed = schema.safeParse(JSON.parse(res.choices[0]?.message?.content ?? "null"));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
};
