import "server-only";
/**
 * Austauschbare KI-Architektur.
 * Neue Provider implementieren `AiProvider` und werden in `getProvider()` registriert.
 * API-Schlüssel kommen ausschließlich aus Server-Umgebungsvariablen und erreichen nie den Browser.
 */
import Anthropic from "@anthropic-ai/sdk";

export interface AiProvider {
  name: string;
  model: string;
  generate(system: string, user: string): Promise<string>;
}

class AnthropicProvider implements AiProvider {
  name = "anthropic";
  model: string;
  private client: Anthropic;
  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  async generate(system: string, user: string): Promise<string> {
    const res = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // bei einer Ablehnung übernimmt serverseitig ein Fallback-Modell
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new Error("Die Anfrage wurde vom Modell abgelehnt.");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (!text) throw new Error("Leere Antwort vom KI-Provider.");
    return text;
  }
}

export function getProvider(): AiProvider | null {
  const provider = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    return new AnthropicProvider(key, process.env.AI_MODEL || "claude-opus-5-5");
  }
  // Weitere Provider hier ergänzen (z. B. lokales Modell) – Schnittstelle: AiProvider
  return null;
}

export const SYSTEM_PROMPT = `Du bist der persönliche Finanzanalyst ("Financial Controller") in der App Wealth OS.
Du erhältst ein JSON-Faktenblatt mit aggregierten Finanzdaten eines jungen Studenten in Berlin, der in 3–5 Jahren eine erste Eigentumswohnung kaufen möchte.

Regeln:
- Verwende AUSSCHLIESSLICH Zahlen aus dem Faktenblatt. Erfinde keine Daten, Kurse, Zinsen oder Marktwerte.
- Felder mit dem Wert "FEHLT" oder Einträge in "missingData" musst du ausdrücklich als fehlend benennen.
- Wenn "isDemoData" true ist, weise zu Beginn darauf hin, dass die Analyse auf fiktiven Demo-Daten beruht.
- Stelle keine Finanzierung als sicher dar. Kennzeichne Annahmen als Annahmen. Keine konkreten Kauf-/Verkaufsempfehlungen für einzelne Wertpapiere.
- Schreibe auf Deutsch, klar und konkret, in Markdown mit kurzen Überschriften. Beträge in Euro.`;

export const REPORT_INSTRUCTIONS = `Erstelle den Monatsbericht mit genau diesen Abschnitten:
1. Finanzielle Entwicklung
2. Einnahmen und Ausgaben
3. Sparquote
4. Vermögensentwicklung
5. Auffälligkeiten
6. Verbesserungspotenzial
7. Konkrete Aufgaben für den nächsten Monat (3–6 abhakbare Punkte)
Halte den Bericht unter 600 Wörtern.`;
