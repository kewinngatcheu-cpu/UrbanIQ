import "server-only";
import { getDb } from "@/lib/db";

/**
 * Connector registry. Status is derived from REAL state only (env credentials present, adapter implemented).
 * "planned" connectors have no adapter yet and cannot be enabled – the UI says so instead of faking a connection.
 */
export interface ConnectorDef {
  id: string;
  name: string;
  category: "ai" | "productivity" | "communication" | "files" | "business" | "finance" | "content" | "lifestyle" | "dev";
  description: string;
  actions: string[];
  permissions: string[];
  auth: "api_key" | "oauth" | "none";
  envVars: string[];
  implemented: boolean;
  phase: number;
}

export const CONNECTORS: ConnectorDef[] = [
  { id: "anthropic", name: "Anthropic Claude", category: "ai", description: "Primäres Sprachmodell für den JARVIS AI Core.",
    actions: ["chat", "strukturierte Extraktion", "Zusammenfassung"], permissions: ["Gesprächsinhalte + relevanter Kontext werden an die API gesendet"],
    auth: "api_key", envVars: ["ANTHROPIC_API_KEY"], implemented: true, phase: 1 },
  { id: "openai", name: "OpenAI", category: "ai", description: "Alternatives Sprachmodell, Stimme (gpt-4o-mini-tts), Spracherkennung (gpt-4o-transcribe) und optionale Embeddings.",
    actions: ["chat", "Sprachausgabe", "Spracherkennung", "embeddings"],
    permissions: ["Gesprächsinhalte, vorzulesende Antworten und Sprachaufnahmen (nur zur Transkription, nicht gespeichert) werden an die API gesendet"],
    auth: "api_key", envVars: ["OPENAI_API_KEY"], implemented: true, phase: 1 },
  { id: "elevenlabs", name: "ElevenLabs", category: "ai", description: "Hochwertige mehrsprachige Stimme für JARVIS (bevorzugt, wenn konfiguriert).",
    actions: ["Sprachausgabe"], permissions: ["Vorzulesende Antworten werden an die API gesendet"],
    auth: "api_key", envVars: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"], implemented: true, phase: 4 },
  { id: "google-calendar", name: "Google Calendar", category: "productivity", description: "Termine lesen, Zeitblöcke vorschlagen.",
    actions: ["Termine lesen", "Termine anlegen (mit Freigabe)"], permissions: ["calendar.readonly", "calendar.events (Stufe 3)"],
    auth: "oauth", envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], implemented: false, phase: 7 },
  { id: "gmail", name: "Gmail", category: "communication", description: "E-Mails zusammenfassen, Entwürfe vorbereiten.",
    actions: ["Lesen", "Entwurf erstellen", "Senden (immer mit Bestätigung)"], permissions: ["gmail.readonly", "gmail.compose"],
    auth: "oauth", envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], implemented: false, phase: 7 },
  { id: "google-drive", name: "Google Drive", category: "files", description: "Dokumente finden und analysieren.",
    actions: ["Dateien lesen"], permissions: ["drive.readonly"], auth: "oauth", envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], implemented: false, phase: 7 },
  { id: "notion", name: "Notion", category: "productivity", description: "Wissensdatenbanken und Projektseiten synchronisieren.",
    actions: ["Seiten lesen", "Seiten anlegen (mit Freigabe)"], permissions: ["Zugriff nur auf freigegebene Seiten"], auth: "oauth", envVars: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"], implemented: false, phase: 7 },
  { id: "github", name: "GitHub", category: "dev", description: "Repositories für App & Software Studio.",
    actions: ["Repos lesen", "Branches/PRs (mit Freigabe)"], permissions: ["repo (nur ausgewählte Repos)"], auth: "oauth", envVars: ["GITHUB_APP_ID"], implemented: false, phase: 6 },
  { id: "search", name: "Websuche / News", category: "business", description: "Research Radar mit Quellen und Datum.",
    actions: ["Suche", "Seiten abrufen"], permissions: ["ausgehende Anfragen an Such-API"], auth: "api_key", envVars: ["SEARCH_API_KEY"], implemented: false, phase: 3 },
  { id: "csv-import", name: "CSV-Import (Finanzen)", category: "finance", description: "Kontoauszüge/Budgets manuell importieren – keine Bankverbindung.",
    actions: ["Import"], permissions: ["nur hochgeladene Dateien"], auth: "none", envVars: [], implemented: false, phase: 2 },
  { id: "apple-health", name: "Apple Health", category: "lifestyle", description: "Nur über native iOS-App möglich (HealthKit) – im Browser nicht verfügbar.",
    actions: ["Trainings/Schlaf lesen"], permissions: ["HealthKit-Freigaben"], auth: "none", envVars: [], implemented: false, phase: 8 },
];

export type ConnectorStatus = "connected" | "configured_disabled" | "missing_credentials" | "planned" | "error";

export async function listConnectorStatus() {
  const db = await getDb();
  const rows = await db.query<{ id: string; enabled: boolean; last_sync: string | null; last_error: string | null }>(`SELECT id, enabled, last_sync, last_error FROM integrations`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return CONNECTORS.map((c) => {
    const row = byId.get(c.id);
    const hasCreds = c.envVars.every((v) => Boolean(process.env[v]));
    const enabled = row ? row.enabled : c.implemented; // implemented connectors default to enabled when credentials exist
    let status: ConnectorStatus;
    if (!c.implemented) status = "planned";
    else if (!hasCreds) status = "missing_credentials";
    else if (row?.last_error) status = "error";
    else status = enabled ? "connected" : "configured_disabled";
    return { ...c, status, enabled: c.implemented && enabled, lastSync: row?.last_sync ?? null, lastError: row?.last_error ?? null,
      missingEnv: c.envVars.filter((v) => !process.env[v]) };
  });
}

export async function setConnectorEnabled(id: string, enabled: boolean) {
  const c = CONNECTORS.find((x) => x.id === id);
  if (!c) throw new Error("Unbekannter Connector");
  if (!c.implemented) throw new Error(`${c.name} ist noch nicht implementiert (geplant für Phase ${c.phase}).`);
  const db = await getDb();
  await db.query(`INSERT INTO integrations (id, enabled) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET enabled = $2, updated_at = now()`, [id, enabled]);
}

export async function isConnectorEnabled(id: string) {
  const all = await listConnectorStatus();
  return all.find((c) => c.id === id)?.status === "connected";
}
