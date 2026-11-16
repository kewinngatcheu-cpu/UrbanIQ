"use client";
import { useEffect, useState } from "react";
import { useFinance } from "@/components/providers";
import { Alert, Badge, Card, PageHeader, Table, Toggle } from "@/components/ui";
import { updateSettings } from "@/lib/db";

type Status = { ai: { configured: boolean; provider: string; model: string }; marketData: { configured: boolean }; interestRates: { configured: boolean } };

/** Rechercheergebnis Stand 11/2026 – siehe docs/INTEGRATIONS.md für Quellen und Details. */
const RESEARCH = [
  {
    prio: 1,
    name: "Bankkonten (PSD2 / Open Banking)",
    status: "Möglich, noch nicht angebunden",
    tone: "warn" as const,
    detail:
      "Enable Banking (lizenzierter Kontoinformationsdienst) erlaubt kostenlose Nutzung für Privatpersonen mit eigenen Konten; Zugriff über Redirect-Login deiner Bank – keine Passwörter/TANs in Wealth OS. GoCardless Bank Account Data nimmt nach Berichten keine neuen Anmeldungen mehr an. Anbindung erfordert eine registrierte App mit Zertifikat (serverseitig) und läuft 90/180 Tage pro Zustimmung.",
    alternative: "CSV/Excel-Kontoauszug-Import (aktiv) mit Duplikaterkennung & Auto-Kategorisierung.",
  },
  {
    prio: 2,
    name: "Trade Republic",
    status: "Keine offizielle API",
    tone: "critical" as const,
    detail: "Trade Republic bietet keine offizielle Drittanbieter-API. Inoffizielle Clients (Reverse Engineering der App-API) erfordern deine Zugangsdaten und verstoßen gegen deine Vorgaben – werden bewusst NICHT verwendet. Seit April 2026 gibt es einen offiziellen CSV-Transaktionsexport in der App.",
    alternative: "Trade-Republic-CSV (Profil → Kontoauszüge → Transaktionsexport) importieren + Positionen manuell pflegen (aktiv).",
  },
  {
    prio: 3,
    name: "Marktdaten ETFs & Aktien",
    status: "Optional verfügbar",
    tone: "good" as const,
    detail: "Alpha Vantage (kostenloser Schlüssel, ~25 Abfragen/Tag, Xetra-Ticker wie VWCE.DEX). Kurse sind ggf. verzögert. Nur Lesezugriff – es können keine Orders ausgelöst werden.",
    alternative: "Manuelle Kurspflege mit Kursdatum & Warnung bei veralteten Kursen (aktiv).",
  },
  {
    prio: 4,
    name: "Immobilienmarktdaten / Kaufpreise",
    status: "Keine freie API",
    tone: "warn" as const,
    detail: "Kostenlose, offizielle Angebots-/Kaufpreis-APIs für Berlin/Brandenburg existieren nicht (Portale wie ImmoScout24 nur kommerziell). Offizielle Quellen: Gutachterausschüsse Berlin/Brandenburg (Grundstücksmarktberichte, Bodenrichtwerte via BORIS), Destatis Häuserpreisindex (GENESIS, Registrierung).",
    alternative: "Kaufpreis, m²-Größe und Miete als gekennzeichnete Annahmen; Szenarien 100–250 Tsd. € (aktiv).",
  },
  {
    prio: 5,
    name: "Zinsdaten Baufinanzierung",
    status: "Optional verfügbar",
    tone: "good" as const,
    detail: "EZB Data Portal – MFI-Zinsstatistik Deutschland (Wohnungsbaukredite, Zinsbindung > 10 J., Neugeschäft). Kostenlos, ohne Schlüssel, read-only. Durchschnittswerte – dein individuelles Angebot kann abweichen.",
    alternative: "Standardannahme 4,04 % (Bundesbank MFI-Zinsstatistik, August 2026) – manuell änderbar.",
  },
  {
    prio: 6,
    name: "CSV- & Excel-Import",
    status: "Aktiv",
    tone: "good" as const,
    detail: "Automatische Erkennung der Kopfzeile, deutsche Zahlen-/Datumsformate, Soll/Haben-Spalten, Windows-1252-Kodierung, .xlsx.",
    alternative: "–",
  },
  {
    prio: 7,
    name: "Export & Backup",
    status: "Aktiv",
    tone: "good" as const,
    detail: "Vollständiges JSON-Backup (wiederherstellbar, validiert), Excel-Arbeitsmappe, CSV, PDF-Monatsbericht.",
    alternative: "–",
  },
];

export default function IntegrationsPage() {
  const data = useFinance();
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);
  const consent = data.settings.consent;
  const setConsent = (patch: Partial<typeof consent>) => updateSettings({ consent: { ...consent, ...patch } });

  return (
    <>
      <PageHeader title="Integrationen & Datenquellen" description="Alle externen Verbindungen sind optional, read-only und standardmäßig AUS. Keine Passwörter, keine TANs, keine Scraper, keine kostenpflichtigen Dienste ohne deine Zustimmung." />

      <Card title="Zustimmungen" subtitle="Ohne Zustimmung findet keine Verbindung zum jeweiligen Dienst statt">
        <div className="divide-y divide-border/60">
          <div>
            <Toggle checked={consent.interestRates} onChange={(v) => setConsent({ interestRates: v })} label="Bauzinsen von der EZB abrufen" description="Sendet nur eine Serien-Kennung an data-api.ecb.europa.eu. Kostenlos, keine persönlichen Daten." />
            <Badge tone={status?.interestRates.configured ? "good" : "neutral"}>bereit</Badge>
          </div>
          <div className="pt-2">
            <Toggle checked={consent.marketData} onChange={(v) => setConsent({ marketData: v })} label="Kurse über Alpha Vantage abrufen" description="Sendet nur den Ticker (z. B. VWCE.DEX). Kostenloser Schlüssel nötig (ALPHAVANTAGE_API_KEY), Tageslimit beachten." />
            <Badge tone={status?.marketData.configured ? "good" : "warn"}>{status?.marketData.configured ? "Schlüssel konfiguriert" : "kein Schlüssel"}</Badge>
          </div>
          <div className="pt-2">
            <Toggle checked={consent.ai} onChange={(v) => setConsent({ ai: v })} label="KI-Finanzanalyst (externer Provider)" description="Sendet ein aggregiertes Faktenblatt (Summen je Kategorie, Vermögenswerte, Ziele – keine Einzeltransaktionen, keine Kontonummern) an den Provider. API-Nutzung ist kostenpflichtig beim Provider." />
            <Badge tone={status?.ai.configured ? "good" : "warn"}>{status?.ai.configured ? `${status.ai.provider} · ${status.ai.model}` : "nicht konfiguriert"}</Badge>
          </div>
        </div>
      </Card>

      <Card className="mt-4" title="Recherche: verfügbare Integrationen (Stand November 2026)" subtitle="Priorisiert nach deinen Vorgaben">
        <Table head={["#", "Integration", "Status", "Bewertung", "Funktionierende Alternative"]}>
          {RESEARCH.map((r) => (
            <tr key={r.prio} className="align-top">
              <td>{r.prio}</td>
              <td className="font-medium">{r.name}</td>
              <td><Badge tone={r.tone}>{r.status}</Badge></td>
              <td className="max-w-md text-xs text-text-2">{r.detail}</td>
              <td className="max-w-xs text-xs">{r.alternative}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-4">
        <Alert tone="info" title="Nächster Schritt Open Banking">
          Für eine PSD2-Anbindung über Enable Banking brauchst du ein (kostenloses) Konto im Enable-Banking-Control-Panel, eine registrierte Anwendung mit eigenem Schlüsselpaar und einen Server mit HTTPS-Callback. Die Datenpipeline in Wealth OS ist darauf vorbereitet (Import-Vorschau, Duplikaterkennung, Kategorisierung). Ich aktiviere das erst nach deiner ausdrücklichen Zustimmung.
        </Alert>
      </div>
    </>
  );
}
