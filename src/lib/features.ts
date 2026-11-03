import "server-only";
import { systemDb } from "@/lib/db";

/** Global product switches, manageable by the owner in /admin/features. */
export const FEATURE_FLAGS = {
  registrations_open: { default: true, description: "Allow new people to create an account." },
  ai_assistant: { default: true, description: "Enable Ask ONE and all AI-powered features (kill switch)." },
  document_uploads: { default: true, description: "Allow uploading files to Memory." },
  voice_notes_preview: { default: false, description: "Show the Voice notes preview (upload only, transcription coming soon)." },
  announcement_banner: { default: false, description: "Show a 'New in ONE' banner on the dashboard." },
  business_signups: { default: true, description: "Allow new ONE Business registrations (companies)." },
  personal_signups: { default: true, description: "Allow new ONE Personal registrations." },
  business_module_projects: { default: true, description: "ONE Business: enable the Projects module." },
  maintenance_mode: { default: false, description: "Maintenance mode: everyone except the owner can read but not change data." },
} as const;

export type FlagKey = keyof typeof FEATURE_FLAGS;

export async function getFlags(): Promise<Record<FlagKey, boolean>> {
  const rows = await systemDb().select("feature_flags");
  const out = {} as Record<FlagKey, boolean>;
  for (const key of Object.keys(FEATURE_FLAGS) as FlagKey[]) {
    const row = rows.find((r) => r.key === key);
    out[key] = row ? row.enabled : FEATURE_FLAGS[key].default;
  }
  return out;
}

export async function isEnabled(key: FlagKey) {
  return (await getFlags())[key];
}

export async function setFlag(key: FlagKey, enabled: boolean) {
  const db = systemDb();
  const row = await db.selectOne("feature_flags", { key });
  if (row) await db.update("feature_flags", { key }, { enabled });
  else await db.insert("feature_flags", { key, enabled, description: FEATURE_FLAGS[key].description });
}
