import { anthropicProvider } from "./providers/anthropic";
import { openaiProvider } from "./providers/openai";
import type { LLMProvider } from "./types";

export const PROVIDERS: Record<LLMProvider["id"], LLMProvider> = { anthropic: anthropicProvider, openai: openaiProvider };

/** Preferred provider if configured, otherwise the other configured one, otherwise null (no fake fallback). */
export function resolveProvider(preferred: LLMProvider["id"]): LLMProvider | null {
  if (PROVIDERS[preferred].configured()) return PROVIDERS[preferred];
  return Object.values(PROVIDERS).find((p) => p.configured()) ?? null;
}

export function providerStatus() {
  return Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, configured: p.configured(), defaultModel: p.defaultModel() }));
}

/** Like resolveProvider, but also respects the owner's on/off switch in the Integrations page. */
export async function resolveEnabledProvider(preferred: LLMProvider["id"]): Promise<LLMProvider | null> {
  const { listConnectorStatus } = await import("@/lib/integrations");
  const status = await listConnectorStatus();
  const usable = (p: LLMProvider) => status.find((c) => c.id === p.id)?.status === "connected";
  if (usable(PROVIDERS[preferred])) return PROVIDERS[preferred];
  return Object.values(PROVIDERS).find(usable) ?? null;
}
