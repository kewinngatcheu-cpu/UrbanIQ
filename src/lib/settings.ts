import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";

export const settingsSchema = z.object({
  language: z.enum(["de", "en"]).default("de"),
  /** off: never store automatically · suggest: proposals need approval in Memory Center · auto: store high-confidence facts directly */
  memoryMode: z.enum(["off", "suggest", "auto"]).default("suggest"),
  aiProvider: z.enum(["anthropic", "openai"]).default("anthropic"),
  anthropicModel: z.string().max(64).default(process.env.ANTHROPIC_MODEL || "claude-opus-5-5"),
  openaiModel: z.string().max(64).default(process.env.OPENAI_MODEL || "gpt-5"),
  effort: z.enum(["low", "medium", "high"]).default("medium"),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).default("07:00"),
  /** Privacy switches: which personal data may be included in AI prompts (personal workspace only). */
  aiContextFinance: z.boolean().default(true),
  aiContextHealth: z.boolean().default(false),
  /** Manually entered balances (no bank connection). null = unknown. */
  financeLiquidCents: z.number().int().nullable().default(null),
  financeSavedCents: z.number().int().nullable().default(null),
  financeBalanceAsOf: z.string().nullable().default(null),
  /** Voice: provider choice (auto = best configured, browser = built-in speech APIs). */
  voiceTts: z.enum(["auto", "browser", "openai", "elevenlabs"]).default("auto"),
  voiceStt: z.enum(["auto", "browser", "openai"]).default("auto"),
  voiceName: z.string().max(40).default("onyx"),
  voiceSpeed: z.number().min(0.7).max(1.4).default(1.05),
  voiceAutoSpeak: z.boolean().default(true),
  /** Working day used by the time-block planner. */
  dayStart: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  dayEnd: z.string().regex(/^\d{2}:\d{2}$/).default("20:00"),
});
export type Settings = z.infer<typeof settingsSchema>;
const SHAPE = settingsSchema.shape;

/** Each key is validated on its own: one invalid stored value falls back to its default without resetting the rest. */
export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.query<{ key: string; value: unknown }>(`SELECT key, value FROM settings`);
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out: Record<string, unknown> = {};
  for (const [k, schema] of Object.entries(SHAPE)) {
    const r = (schema as z.ZodType).safeParse(stored.has(k) ? stored.get(k) : undefined);
    out[k] = r.success ? r.data : (schema as z.ZodType).parse(undefined);
  }
  return out as Settings;
}

/** Only keys present in the patch are written. */
export async function updateSettings(patch: Record<string, unknown>): Promise<Settings> {
  const db = await getDb();
  const entries: [string, unknown][] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in SHAPE) || v === undefined) continue;
    entries.push([k, (SHAPE[k as keyof typeof SHAPE] as z.ZodType).parse(v)]);
  }
  for (const [k, v] of entries) {
    await db.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [k, JSON.stringify(v)],
    );
  }
  return getSettings();
}
