# Qualitätsbericht – NGCX Radar #1: Scope-Verlust-Rechner

## Lieferumfang

| Datei | Inhalt |
|---|---|
| `output/NGCX_Radar_1_Scope-Verlust-Rechner.xlsx` | Interaktiver Rechner (Tab „Radar“ + Tab „So funktioniert’s“) |
| `output/NGCX_Radar_1_Scope-Verlust-Rechner.pdf` | PDF-Begleiter, 2 Seiten DIN A4 hoch, ausfüllbare Formularfelder |
| `qa/` | Gerenderte Vorschauen aller Seiten und Tabellenblätter, Randfälle, `testergebnis.json` |
| `build/` | Build-Skripte (`make.sh`, `build_xlsx.py`, `build_pdf.py`, `test_xlsx.py`) zur Reproduktion |

## Was wurde umgesetzt?

**Excel – Tab „Radar“** (passt ohne horizontales Scrollen auf den Bildschirm, Druck: eine A4-Seite hoch)
- Kopfbereich auf Fast Black: „NGCX INTELLIGENCE · RADAR #1“, Haupttitel, rechts „Know. Decide. Grow.“
- **01 – Eure Werte:** sechs gelbe Eingabefelder (#FFF2B3, blaue Schrift) mit den Beispielwerten, Einheit und kurzem Hilfetext je Zeile
- **02 – Euer Ergebnis:**
  - Hauptkennzahl „Geschätzter Verlust pro Jahr“ groß in NGCX Blue, darunter der dynamische Satz zu den Projektäquivalenten
  - Balkendiagramm Verlust pro Jahr vs. Ø Projektvolumen (2D, ohne Legende und Gitternetzlinien, passt sich automatisch an)
  - Ampel mit bedingter Formatierung (Grün / Gelb / Rot, neutral grau bei „–“), direkt darunter der vorgegebene NGCX-Orientierungshinweis
  - „Rechenweg im Detail“ mit allen fünf Kennzahlen und der jeweiligen Formel in Worten
  - Hebel-Szenario mit dynamischer Rechnungszeile und dem Hinweis „Theoretisches Szenario – keine garantierte Ergebnisverbesserung“
- **03 – Was dieser Rechner nicht zeigt:** vollständiger Teaser-Text im dunklen Block
- Datenschutz- und Vertrauenshinweis klein am unteren Rand

**Excel – Tab „So funktioniert’s“:** Idee, Berechnungslogik mit Formeln und Beispiel, Ampel-Orientierung, Definitionen (was zählt dazu und was nicht), Annahmen und Grenzen, Diagrammdaten, Datenschutzhinweis.

**PDF – Seite 1 „Das Problem verstehen“:** Einleitungstext, die sechs Beispielwerte, Rechenweg in fünf Schritten, Hauptergebnis (66.000 € und 2,2 Projektvolumen mit Mini-Balkenvergleich), Ampel mit Erklärung und Einschränkung, Hinweis auf die Excel-Version.
**PDF – Seite 2 „Arbeitsblatt“:** sechs ausfüllbare Eingabefelder (A–F) mit Einheit und Erklärung, sechs ausfüllbare Ergebnisfelder mit Formel in Buchstaben, Ampel-Legende, dunkler Teaser-Block (#0B0C0F), Datenschutzhinweis.

## Integrierte Funktionen (Excel)

- Alle 13 Ergebnisse laufen über echte Formeln, ohne XLOOKUP, LET oder FILTER. Verwendet werden nur MAX, N, IF, ISNUMBER, ROUND, INT und FIXED, die Excel, Google Sheets und Apple Numbers beherrschen.
- Eingaben sind mit `MAX(0;N(…))` abgesichert: Leere Felder, eingefügter Text oder negative Werte führen zu keinem Formelfehler.
- Division durch null wird abgefangen (`WENN(Projektvolumen=0;"–";…)`).
- Datenüberprüfung: nur Zahlen ≥ 0, Projekte nur als ganze Zahlen. Beim Anklicken erscheint eine Eingabemeldung mit Hilfetext, bei ungültigen Werten eine Fehlermeldung.
- Blattschutz ohne Passwort, nur die sechs Eingabefelder sind entsperrt.
- Rasterlinien aus, Schrift durchgehend Arial, Druckbereich A4 hoch auf eine Seite skaliert.
- Die Datei rechnet beim Öffnen neu (`fullCalcOnLoad`). Die gespeicherten Werte wurden mit deutschem Gebietsschema berechnet, deshalb zeigen auch Vorschauen ohne Rechenfunktion (z. B. iPhone-Mailvorschau) „66.000 €“ und „2,2“.

## Testwerte – alle erreicht

| Kennzahl | Erwartet | Ergebnis |
|---|---|---|
| Unbezahlte Stunden pro Projekt | 33 h | **33 h** ✔ |
| Verlust pro Projekt | 3.300 € | **3.300 €** ✔ |
| Verlustanteil | 11,0 % | **11,0 %** ✔ |
| Verlust pro Jahr | 66.000 € | **66.000 €** ✔ |
| Projektäquivalente | 2,2 | **2,2** ✔ |
| Ampel | Rot | **ROT** ✔ |
| Hebel-Szenario | +15.000 € | **+15.000 €** ✔ |

## Getestete Randfälle (16 Szenarien, jeweils neu berechnet, 0 Formelfehler)

Alle Eingaben null · Projektvolumen null · Stundensatz null · sehr hoher Stundensatz · sehr viele Projekte · sehr hohe Stundenwerte · Kombination aus null und Maximalwerten · alle Maximalwerte · Grenze genau 5 % (→ Gelb) · Grenze genau 10 % (→ Gelb) · knapp unter 5 % (→ Grün) · leere Felder · eingefügter Text · eingefügte negative Zahl · Dezimalstunden.

Nicht berechenbare Kennzahlen (Verlustanteil, Projektäquivalente, Ampel) zeigen „–“. Statt des Satzes erscheint dann ein neutraler Hinweis. Die Einzelergebnisse stehen in `qa/testergebnis.json`. Zur visuellen Kontrolle wurden die Fälle „alles null“ und „Maximalwerte“ gerendert: Es gibt keine „###“-Anzeigen und keine abgeschnittenen Texte.

## Anpassungen gegenüber dem Konzept

1. **Obergrenzen in der Datenüberprüfung:** Projekte bis 1.000, Projektvolumen bis 10 Mio. €, Stundensatz bis 1.000 €, je Stundenfeld bis 10.000 Std. Ohne Grenzen würden absurde Eingaben (z. B. Tippfehler mit zu vielen Nullen) als „#####“ angezeigt. Die Grenzen sind im Tab „So funktioniert’s“ dokumentiert.
2. **Verlustanteil als Prozentformat:** Statt „× 100“ in der Formel wird der Anteil als Prozentwert formatiert. Das Ergebnis ist identisch (11,0 %).
3. **PDF Seite 2:** Die Eingaben tragen die Buchstaben A–F, damit die Formeln kurz und eindeutig sind (z. B. „Ergebnis 2 × A“). Das Hebel-Szenario ist als zusätzliche Rechenzeile aufgenommen.
4. **Ergänzung:** Der Tab „So funktioniert’s“ enthält eine Tabelle „Was nicht gemeint ist“ (z. B. bezahlte Change Requests, Gewährleistung), damit nicht zu viele Stunden eingetragen werden.

## Bekannte Einschränkungen

- **Schrift im PDF:** Arial ist in der Build-Umgebung nicht installiert. Eingebettet ist deshalb Liberation Sans, die metrisch identisch zu Arial ist (gleiche Zeichenbreiten und gleiches Schriftbild in der Wirkung). Die Excel-Datei verwendet echtes Arial.
- **Formularfelder im PDF** nutzen die Standardschrift Helvetica des PDF-Viewers. Eine automatische Berechnung gibt es dort bewusst nicht, denn das PDF enthält kein JavaScript.
- **Google Sheets / Apple Numbers:** Formeln und Ergebnisse funktionieren dort, aber einzelne Gestaltungsdetails werden dort eventuell nicht exakt übernommen: Balkenfarben je Datenpunkt im Diagramm, Eingabemeldungen der Datenüberprüfung, Blattschutz. Den vollen Funktionsumfang bietet Microsoft Excel.
- Die visuelle Prüfung wurde mit LibreOffice und Poppler gerendert. Microsoft Excel selbst stand nicht zur Verfügung. Spaltenbreiten und Zeilenhöhen sind so großzügig gesetzt, dass leichte Abweichungen der Darstellung keine Texte abschneiden.
- Ab einem Stundenwert von 1.000 erscheint in den Stundenfeldern kein Tausenderpunkt. Das ist nötig, damit Dezimalstunden (z. B. 7,5) korrekt angezeigt werden.

## Neu erzeugen

```bash
./build/make.sh                                   # Excel bauen + neu berechnen
python3 build/build_pdf.py output/NGCX_Radar_1_Scope-Verlust-Rechner.pdf
python3 build/test_xlsx.py output/NGCX_Radar_1_Scope-Verlust-Rechner.xlsx <xlsx-skill>/scripts qa/testergebnis.json
```
