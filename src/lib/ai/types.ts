import type { z } from "zod";

export interface ChatTurn { role: "user" | "assistant"; content: string }

export interface StreamParams {
  system: string;
  messages: ChatTurn[];
  model?: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface StreamResult {
  text: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  stopReason: string; // end_turn | max_tokens | refusal | ...
}

export interface LLMProvider {
  id: "anthropic" | "openai";
  label: string;
  configured(): boolean;
  defaultModel(): string;
  stream(p: StreamParams, onDelta: (text: string) => void): Promise<StreamResult>;
  /** Structured JSON output validated against a zod schema. Returns null if the model output does not validate. */
  json<T>(p: { system: string; prompt: string; schema: z.ZodType<T>; model?: string }): Promise<T | null>;
}

export class ProviderNotConfiguredError extends Error {}
