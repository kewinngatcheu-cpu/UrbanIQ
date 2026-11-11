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
});
export type Settings = z.infer<typeof settingsSchema>;

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.query<{ key: string; value: unknown }>(`SELECT key, value FROM settings`);
  const obj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const parsed = settingsSchema.safeParse(obj);
  return parsed.success ? parsed.data : settingsSchema.parse({});
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const valid = settingsSchema.partial().parse(patch);
  const db = await getDb();
  for (const [k, v] of Object.entries(valid)) {
    if (v === undefined) continue;
    await db.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [k, JSON.stringify(v)],
    );
  }
  return getSettings();
}
