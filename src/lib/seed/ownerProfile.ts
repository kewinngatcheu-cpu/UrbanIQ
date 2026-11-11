/**
 * Initial knowledge from Kewin's JARVIS brief (2026-11). Loaded once when the owner account is created.
 * Everything here is editable/deletable in the Memory Center afterwards.
 * Privacy note: to keep personal details out of the repository, replace this file with a local,
 * git-ignored copy before pushing to a public remote.
 */
import type { MemoryInput } from "@/lib/memory/service";

export const SEED_WORKSPACES = [
  {
    id: "personal",
    name: "Persönlich",
    kind: "personal" as const,
    description: "Privates Leben, Studium, Fitness, Finanzen, persönliche Entwicklung.",
    color: "#37CFFF",
    profile: {},
  },
  {
    id: "ngcx",
    name: "NGCX",
    kind: "business" as const,
    description: "Decision Intelligence für IT-Dienstleister, IT-Beratungen und B2B-Technologie-Dienstleister.",
    color: "#1677FF",
    profile: {
      targetMarket: "IT-Dienstleister, IT-Beratungen, B2B-Technologie-Dienstleister",
      productDirection: "Decision Intelligence",
      phase: "Validierung / MVP-Konzept",
      principles: [
        "Problem vor Produkt",
        "Wert vor Technologie",
        "Vertrauen vor Integration",
        "Positionierung vor Reichweite",
        "Beweis vor Skalierung",
      ],
      connects: ["Vertrieb", "Pipeline", "Opportunities", "Kunden", "Projekte", "Ressourcen", "Kapazität", "Finanzen", "Business Performance"],
    },
  },
  {
    id: "venturesx",
    name: "VenturesX",
    kind: "business" as const,
    description: "Eigenständige Venture. Geschäftsmodell, Zielmarkt und Strategie sind noch nicht hinterlegt.",
    color: "#258BFF",
    profile: {
      targetMarket: null,
      productDirection: null,
      phase: "Nicht definiert – Informationen ausstehend",
    },
  },
];

const seed = (m: Omit<MemoryInput, "source">): MemoryInput => ({ ...m, source: "seed", sourceRef: "owner-brief-2026-11" });

export const SEED_MEMORIES: MemoryInput[] = [
  seed({ workspaceId: "personal", layer: "identity", category: "profil", pinned: true, importance: 5,
    title: "Name und Ansprache", content: "Kewin Ngatcheu, bevorzugte Ansprache: Kewin. 20 Jahre alt, lebt in Berlin, Deutschland." }),
  seed({ workspaceId: "personal", layer: "identity", category: "sprache", pinned: true, importance: 5,
    title: "Sprache", content: "Primärsprache Deutsch (Standard für alle Antworten). Englisch als Zweitsprache; Wechsel auf Anfrage." }),
  seed({ workspaceId: "personal", layer: "identity", category: "ausbildung", pinned: true, importance: 4,
    title: "Studium", content: "Studiert Business Administration (BWL) an der HWR Berlin und baut parallel unternehmerische Aktivitäten auf.",
    reviewAt: new Date(Date.now() + 180 * 864e5).toISOString() }),
  seed({ workspaceId: "personal", layer: "identity", category: "kommunikation", pinned: true, importance: 5,
    title: "Erwartete Kommunikation", content: "Analytisch, strategisch, direkt, ehrlich. Kritisch, wenn nötig – nicht zustimmen, nur um zu gefallen. Keine Floskeln oder Motivationssprüche. Fakten, Annahmen und Empfehlungen klar trennen. Hinweisen bei Ablenkung, Prokrastination oder zu vielen parallelen Themen." }),
  seed({ workspaceId: "personal", layer: "identity", category: "interessen", importance: 3,
    title: "Interessen", content: "KI, Softwareentwicklung, Finanzen, Vertrieb, Business Intelligence, Entrepreneurship, Unternehmensberatung, Management, Volkswirtschaft, Technologie, Immobilien, Fitness, persönliche Entwicklung, Produktivität, Investieren." }),
  seed({ workspaceId: "personal", layer: "identity", category: "geraete", importance: 2,
    title: "Geräte", content: "Nutzt MacBook, iPad und iPhone." }),
  seed({ workspaceId: "personal", layer: "strategic", category: "ambitionen", pinned: true, importance: 5,
    title: "Langfristige Ambition", content: "Mehrere Unternehmen aufbauen und besitzen, skalierbare Geschäftsmodelle entwickeln, Teams aufbauen, Abläufe automatisieren, langfristige finanzielle Unabhängigkeit. Fähigkeiten in Führung, Finanzen, Vertrieb, Technologie und strategischem Management ausbauen." }),
  seed({ workspaceId: "personal", layer: "strategic", category: "finanzziel", importance: 4,
    title: "Finanzielles Ziel (aus früherem Briefing)", content: "Ziel: 10.000 € persönliches Nettoeinkommen pro Monat innerhalb von fünf Jahren, mit deutlich größerer Langfrist-Ambition.",
    confidence: 0.8, reviewAt: new Date(Date.now() + 90 * 864e5).toISOString() }),
  seed({ workspaceId: "personal", layer: "strategic", category: "werte", importance: 4,
    title: "Arbeitsprinzipien", content: "Umsetzung vor endloser Planung, datenbasierte Entscheidungen, Effizienz und Automatisierung, Finanzdisziplin, kontinuierliche Verbesserung, Langfristdenken, hohe Qualität. Produktivität ≠ ständig beschäftigt sein: Aufmerksamkeit schützen." }),
  seed({ workspaceId: "ngcx", layer: "business", category: "positionierung", pinned: true, importance: 5,
    title: "NGCX Positionierung", content: "NGCX fokussiert auf die IT-Branche: IT-Dienstleister, IT-Beratungen und B2B-Technologie-Dienstleister. Strategische Produktrichtung: Decision Intelligence – Vertrieb, Pipeline, Opportunities, Kunden, Projekte, Ressourcen, Kapazität, Finanzen und Business Performance verbinden, Risiken erkennen, Entwicklungen vorhersagen, bessere Entscheidungen unterstützen." }),
  seed({ workspaceId: "ngcx", layer: "business", category: "prinzipien", pinned: true, importance: 5,
    title: "NGCX Prinzipien", content: "1. Problem vor Produkt. 2. Wert vor Technologie. 3. Vertrauen vor Integration. 4. Positionierung vor Reichweite. 5. Beweis vor Skalierung. Features oder Ideen, die dem widersprechen, aktiv hinterfragen." }),
  seed({ workspaceId: "ngcx", layer: "business", category: "positionierung", status: "outdated", importance: 2,
    title: "Überholt: Marketing-Agentur-Positionierung", content: "Frühere Positionierung (Profitability Monitor für Marketing-/Performance-Agenturen) ist überholt und darf nicht mehr verwendet werden. Ersetzt durch Fokus auf IT-Dienstleister und Decision Intelligence." }),
  seed({ workspaceId: "venturesx", layer: "business", category: "status", status: "uncertain", importance: 3, confidence: 0.3,
    title: "VenturesX – Informationen ausstehend", content: "Geschäftsmodell, Zielmarkt, Produkte, Betriebsmodell und Ziele von VenturesX sind noch nicht bekannt. Nicht annehmen, dass VenturesX wie NGCX funktioniert. Bei Bedarf gezielt nachfragen." }),
];
