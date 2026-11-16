# Wealth OS – Personal Finance & Wealth Dashboard

Persönliches Finanz- und Vermögenssystem: Budget, Vermögensaufbau, Immobilien-Eigenkapital-Tracker, Prognosen und Financial Intelligence. Local-first, offline-fähig, Dark Mode, optimiert für iPhone, iPad und Desktop.

> Beim ersten Start werden **DEMO-DATEN** geladen (deutlich gekennzeichnet). Unter *Einstellungen → Mit echten Daten starten* übernimmt die App deine Planwerte (1.400 € netto, Fixkosten, Kredit bis 03/2027, Budgets) mit leeren Kontoständen.

## Schnellstart

```bash
cd wealth-os
npm install
npm run dev          # http://localhost:3000
```

Produktion: `npm run build && npm start`. Optionale Integrationen: `.env.example` nach `.env.local` kopieren.

## Tests

| Befehl | Inhalt |
|---|---|
| `npm test` | 50 Unit-Tests für alle Finanzberechnungen (Budget, Kreditende, Annuität, Restschuld, Nebenkosten Berlin/Brandenburg, Prognose, CSV-Import, Backup-Validierung) |
| `npm run test:e2e` | 16 End-to-End-Abläufe im Browser (Server muss laufen, `BASE_URL` setzen) |
| `npm run test:smoke` | Alle 13 Seiten laden + Screenshots (`--mobile` für iPhone) |
| `npm run typecheck` / `npm run lint` | TypeScript & ESLint |

## Architektur

```
src/
├─ lib/
│  ├─ types.ts              Datenmodell (FinanceData)
│  ├─ finance/              reine, getestete Berechnungsfunktionen (kein UI, kein I/O)
│  │  ├─ plan.ts            Monatsplan, Soll-Ist, Warnungen (Start/Ende je Posten → Kreditende 03/2027)
│  │  ├─ wealth.ts          Vermögen, Snapshots, Notgroschen
│  │  ├─ loan.ts            Annuität, Restschuld, Tilgungsplan
│  │  ├─ property.ts        Kaufnebenkosten, Eigenkapital, Finanzierung, Szenarien
│  │  ├─ projection.ts      Prognose 12–60 Monate, 3 Szenarien, Simulator
│  │  ├─ analyst.ts         regelbasierter Analyst, Monatsbericht, Fragen, KI-Faktenblatt
│  │  └─ csv.ts             CSV-Parser, Spaltenerkennung, Kategorisierung, Duplikate
│  ├─ db/                   Dexie/IndexedDB-Repository + Zod-Backup-Schema
│  ├─ ai/provider.ts        austauschbare KI-Provider (server-only, Schlüssel nur aus env)
│  └─ export.ts             JSON-Backup, CSV, Excel (exceljs), PDF (jsPDF)
├─ app/                     Next.js App Router – 13 Seiten + API-Routen
└─ components/              UI-Bausteine, Recharts-Diagramme, Modals
```

**Technologieentscheidungen**

- **Next.js 16 + React 19 + TypeScript 5.9 + Tailwind CSS 4 + Recharts 3** – aktuelle, untereinander kompatible Versionen (geprüft 11/2026). TypeScript 7 (nativ) wurde bewusst noch nicht genutzt.
- **IndexedDB (Dexie) statt Supabase**: Finanzdaten bleiben auf deinem Gerät, die App funktioniert offline, braucht keinen Account und läuft auf jedem statischen Hosting. Alle Zugriffe laufen über `lib/db` → ein Sync-Adapter (z. B. Supabase mit Row-Level-Security) lässt sich später ergänzen, ohne UI/Berechnungen zu ändern. Geräteübergreifend: JSON-Backup exportieren/einspielen.
- **Berechnungen als reine Funktionen** → vollständig testbar; Seiten berechnen alles live aus den gespeicherten Daten.
- **KI optional & austauschbar**: Ohne KI liefert ein regelbasierter Analyst Hinweise, Antworten und den Monatsbericht. Mit KI wird nur ein aggregiertes Faktenblatt (keine Einzeltransaktionen) serverseitig an den Provider geschickt; der Prompt verbietet erfundene Zahlen und verlangt die Kennzeichnung fehlender Daten.

## Datenschutz & Sicherheit

- Keine Passwörter, TANs, Bank-Scraper oder Browser-Automationen.
- Alle externen Verbindungen sind standardmäßig aus und brauchen deine Zustimmung (*Integrationen*).
- API-Schlüssel nur in `.env.local` (serverseitig), `/api/status` zeigt nur, *ob* etwas konfiguriert ist.
- Keine Ausführung von Wertpapierorders – die Marktdaten-Anbindung ist rein lesend.

Details zu Integrationen und Quellen: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

*Keine Anlage-, Steuer- oder Finanzierungsberatung. Alle Prognosen und Finanzierungsrechnungen sind Modellrechnungen auf Basis gekennzeichneter Annahmen.*
