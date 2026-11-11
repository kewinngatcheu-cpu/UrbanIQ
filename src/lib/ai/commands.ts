/**
 * Deterministic chat commands. They work without any AI provider and report only what actually happened.
 *   /merke <text>                      → store a memory in the current workspace
 *   /aufgabe <titel> [!kritisch|!hoch|!niedrig] [@YYYY-MM-DD]   → create a task
 */
export type ParsedCommand =
  | { kind: "remember"; text: string }
  | { kind: "task"; title: string; priority: "critical" | "high" | "medium" | "low"; dueAt: string | null }
  | { kind: "help" }
  | null;

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
