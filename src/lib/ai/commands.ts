/**
 * Deterministic chat commands. They work without any AI provider and report only what actually happened.
 *   /merke <text>                      → store a memory in the current workspace
 *   /aufgabe <titel> [!kritisch|!hoch|!niedrig] [@YYYY-MM-DD]   → create a task
 */
export type ParsedCommand =
  | { kind: "remember"; text: string }
  | { kind: "task"; title: string; priority: "critical" | "high" | "medium" | "low"; dueAt: string | null }
  | { kind: "help" }
  | { kind: "briefing" }
  | { kind: "spendable" }
  | { kind: "focus"; minutes: number }
  | null;

const PREFIX = /^(?:(?:hey|hallo|ok|okay)\s+)?(?:jarvis)?[,:!.]?\s*/i;

/**
 * Spoken German intents (voice mode only). Deliberately narrow, clear phrasings – anything else goes to the AI.
 * Returns the same command shapes as the slash commands, so execution and audit are identical.
 */
export function parseVoiceIntent(input: string): ParsedCommand {
  const raw = input.trim().replace(/\s+/g, " ");
  // Strip the wake name at the start ("Jarvis, …") and at the end ("Guten Morgen, Jarvis").
  const s = raw.replace(PREFIX, "").replace(/[.!?]+$/, "").replace(/,?\s*jarvis$/i, "").trim();
  const lower = s.toLowerCase();

  // Greeting alone, or explicit briefing request → spoken daily briefing
  if (!s || /^(guten (morgen|tag|abend)|moin|servus|hallo|hi|hey)( jarvis)?$/i.test(s) ||
      /\b(briefing|was steht (heute )?an|wie sieht mein tag aus|was liegt heute an|überblick für heute)\b/i.test(lower)) {
    return { kind: "briefing" };
  }
  let m = s.match(/^(?:bitte\s+)?merk(?:e)?\s+(?:dir|dich)\b[,:]?\s*(?:bitte\s*)?(?:,?\s*dass\s+)?(.+)$/i);
  if (m && m[1].trim().length > 3) return { kind: "remember", text: capitalize(m[1].trim()) };
  m = s.match(/^(?:bitte\s+)?(?:erstell(?:e)?|leg(?:e)?|füg(?:e)?)\s+(?:mir\s+)?(?:eine\s+)?(?:neue\s+)?aufgabe(?:\s+(?:an|hinzu)\b)?\s*[,:]?\s*(.+)$/i)
    ?? s.match(/^neue aufgabe[,:]?\s*(.+)$/i)
    ?? s.match(/^erinnere mich(?: daran)?[,:]?\s*(?:dass\s+ich\s+|zu\s+|an\s+)?(.+)$/i);
  if (m && m[1].trim().length > 2) {
    let title = m[1].trim().replace(/^(?:an|hinzu)\b[,:]?\s*/i, "");
    let priority: "critical" | "high" | "medium" | "low" = "medium";
    const p = title.match(/,?\s*(?:mit\s+)?(?:priorität\s+)?(kritisch|hoch|wichtig|dringend|niedrig)(?:er priorität)?$/i);
    if (p) {
      const k = p[1].toLowerCase();
      priority = k === "kritisch" || k === "dringend" ? "critical" : k === "niedrig" ? "low" : "high";
      title = title.slice(0, p.index).trim();
    }
    return { kind: "task", title: capitalize(title), priority, dueAt: null };
  }
  if (/\bwie ?viel\b.*\b(ausgeben|übrig)\b|\bwas kann ich\b.*\bausgeben\b|\bbudget\b.*\b(übrig|noch)\b/i.test(lower)) return { kind: "spendable" };
  m = s.match(/^(?:bitte\s+)?start(?:e)?\s+(?:eine?\s+)?fokus(?:-?\s?session|zeit|block)?(?:\s+(?:für|von)\s+(\d{1,3})\s*min(?:uten)?)?$/i);
  if (m) return { kind: "focus", minutes: Math.min(180, Math.max(5, Number(m[1] ?? 50))) };
  return null;
}

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function parseCommand(input: string): ParsedCommand {
  const s = input.trim();
  const remember = s.match(/^\/(?:merke|remember)\s+([\s\S]+)$/i);
  if (remember) return { kind: "remember", text: remember[1].trim() };
  const task = s.match(/^\/(?:aufgabe|task)\s+([\s\S]+)$/i);
  if (task) {
    let rest = task[1];
    let priority: "critical" | "high" | "medium" | "low" = "medium";
    const pr = rest.match(/(?:^|\s)!(kritisch|critical|hoch|high|mittel|medium|niedrig|low)\b/i);
    if (pr) {
      const k = pr[1].toLowerCase();
      priority = k.startsWith("krit") || k === "critical" ? "critical" : k === "hoch" || k === "high" ? "high" : k === "niedrig" || k === "low" ? "low" : "medium";
      rest = rest.replace(pr[0], " ");
    }
    let dueAt: string | null = null;
    const due = rest.match(/(?:^|\s)@(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
    if (due) {
      // Interpret as Europe/Berlin local time; default 18:00.
      dueAt = berlinToIso(due[1], due[2] ?? "18:00");
      rest = rest.replace(due[0], " ");
    }
    const title = rest.replace(/\s+/g, " ").trim();
    if (!title) return null;
    return { kind: "task", title, priority, dueAt };
  }
  if (/^\/(?:hilfe|help)$/i.test(s)) return { kind: "help" };
  return null;
}

export function berlinToIso(date: string, time: string): string {
  // Find the UTC offset Berlin has on that date (CET +1 / CEST +2).
  const probe = new Date(`${date}T12:00:00Z`);
  const berlinHour = Number(probe.toLocaleString("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }));
  const offset = berlinHour - 12;
  const sign = offset >= 0 ? "+" : "-";
  return new Date(`${date}T${time}:00${sign}${String(Math.abs(offset)).padStart(2, "0")}:00`).toISOString();
}

export const HELP_TEXT = `**Befehle (funktionieren auch ohne KI-Anbieter):**
- \`/merke <Text>\` – speichert eine Erinnerung im aktuellen Workspace
- \`/aufgabe <Titel> !hoch @2026-11-20\` – legt eine Aufgabe an (Priorität: !kritisch, !hoch, !mittel, !niedrig; Fälligkeit optional)
- \`/hilfe\` – diese Übersicht`;
