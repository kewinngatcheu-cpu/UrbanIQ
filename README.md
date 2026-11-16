# KEWIN FINANCE

Persönlicher Finanz-Tracker für Kewin Ngatcheu: einfach, Mobile First, Dark & Light Mode.
Ausgaben in unter 30 Sekunden eintragen, Sparziele füllen, Vermögen und Eigenkapital für die erste Eigentumswohnung im Blick behalten.

## Starten

```bash
npm install
npm run dev        # http://localhost:3000
```

Produktion: `npm run build && npm start`.

**Online (Vercel):** Repository importieren – Next.js wird automatisch erkannt, keine Einstellungen nötig (Root Directory leer lassen). Auf dem iPhone in Safari öffnen → Teilen → **Zum Home-Bildschirm** (startet dann wie eine App).

## Bereiche

1. **Dashboard** – verfügbares Geld, Budgets, Kennzahlen, letzte Ausgaben & Sparbewegungen, Monatsübersicht, Sparziele
2. **Ausgaben** – Liste mit Monats-/Jahresfilter und Kategorien, Monatsübersicht (geplant vs. tatsächlich, Kreis- & Balkendiagramme), Jahresübersicht, CSV
3. **Sparziele** – beliebig viele Ziele, Einzahlen / Entnehmen / Umschichten / Depotwert, Prognose; Unterseite **Immobilienziel**
4. **Vermögen** – Bankguthaben, Tagesgeld, Immobilienrücklagen, Trade Republic, Sonstiges, Kreditschulden, Nettovermögen monatlich & jährlich
5. **Einstellungen** – Einnahmen, Fixkosten (mit Laufzeit), Sparpläne, Budgets, Design, Backup, CSV, Zurücksetzen

Großer **+**-Button (iPhone) bzw. Seitenleiste (Desktop): *Ausgabe hinzufügen*, *Geld sparen*, *Sparziel erstellen*.

## Rechenregeln

- **Frei für Sparziele** = Einkommen − Fixkosten − Sparpläne − persönliches Budget − Reisebudget (heute 418 €, ab April 2027 579 €, weil der Kredit automatisch entfällt).
- **Noch verfügbar** = Einkommen − Fixkosten − eingetragene Ausgaben − Gespartes.
- **Sparen ist keine Ausgabe**: Eine Einzahlung verschiebt Geld vom Girokonto in die Rücklage → verfügbares Geld sinkt, Nettovermögen bleibt gleich. Umschichtungen zwischen Zielen ändern nichts an den Summen. Wertänderungen (Depot, Zinsen) ändern das Vermögen, zählen aber nicht als gespart.
- **Girokonto**: Du trägst den Kontostand ein; Sparbuchungen danach werden automatisch verrechnet.
- **Trade Republic (150 €)** ist ein Sparplan, der ab dem Folgemonat jeweils am 2. automatisch dem Ziel *Investments* gutgeschrieben wird (abschaltbar).
- **Kredit**: Restschuld sinkt monatlich um 161 €, ab April 2027 ist sie 0 und die Rate ist aus dem Budget verschwunden. Startwert = verbleibende Raten × 161 € (ohne Zinsen, als *geschätzt* markiert – bitte genauen Wert eintragen).
- **Prognose Sparziel**: fehlender Betrag ÷ (monatlicher Sparbetrag + Sparpläne); ohne Plan Ø der letzten 3 Monate.

Es werden **keine Kontostände oder Transaktionen erfunden** – alle Guthaben starten bei 0 €.
Voreingestellte Zielbeträge (30.000 € Immobilie, 1.200 € Reisen, 3.000 € Notgroschen, 10.000 € Investments, 1.000 € individuell) sind Vorschläge und frei änderbar.

## Daten

Lokal im Browser (IndexedDB), offline, ohne Konto. Backup als JSON (validiert beim Einspielen), Export als CSV (Excel/Numbers-kompatibel).
Alle Datenzugriffe laufen über `src/lib/db.ts` – ein späterer Cloud-Sync (z. B. Supabase) kann dort ergänzt werden.

## Tests

| Befehl | Inhalt |
|---|---|
| `npm test` | 25 Unit-Tests: Budget, Kreditende 04/2027, Sparen ohne Doppelzählung, Umschichtung, Prognose, Sparplan-Automatik, Restschuld, Speicherung, Backup |
| `npm run test:e2e` | 15 Abläufe im emulierten iPhone 15 (Server muss laufen, `BASE_URL` setzen; gegen `npm start` ausführen) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## Struktur

```
src/lib/types.ts         Datenmodell
src/lib/calc/finance.ts  alle Berechnungen (rein, getestet)
src/lib/db.ts            Speicherung, Aktionen, Backup
src/lib/seed.ts          Ausgangswerte aus deinen Angaben
src/components/          UI, Diagramme, Eingabe-Sheets
src/app/                 die 5 Bereiche + Immobilienziel
```
