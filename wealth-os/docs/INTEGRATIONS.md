# Integrationen & Datenquellen (Recherche Stand November 2026)

| # | Integration | Ergebnis | Umsetzung in Wealth OS |
|---|---|---|---|
| 1 | Bankkonten (PSD2) | **Enable Banking** bietet kostenlose Nutzung für Privatpersonen mit eigenen Konten (lizenzierter AISP, Redirect-Login bei der Bank). **GoCardless Bank Account Data** nimmt Berichten zufolge keine Neuanmeldungen mehr an. | Noch nicht angebunden (braucht registrierte App + Schlüsselpaar + HTTPS-Callback und deine ausdrückliche Zustimmung). Funktionierende Alternative: CSV/Excel-Kontoauszug-Import mit Duplikaterkennung. |
| 2 | Trade Republic | Keine offizielle API. Inoffizielle Clients benötigen Zugangsdaten → **ausgeschlossen**. Seit April 2026 offizieller **CSV-Transaktionsexport** in der App (Profil → Kontoauszüge → Transaktionsexport). | CSV-Import + manuelle Positionspflege (Stück, Einstand, Kurs, Kursdatum). |
| 3 | Marktdaten | Alpha Vantage `GLOBAL_QUOTE`, kostenloser Schlüssel, begrenzte Abfragen/Tag, Xetra-Ticker `*.DEX`. | `/api/market/quote` – optional, read-only, Zustimmung erforderlich. |
| 4 | Immobilienpreise | Keine freie offizielle Kaufpreis-API. Offizielle Quellen: Gutachterausschüsse Berlin/Brandenburg (Grundstücksmarktberichte, BORIS-Bodenrichtwerte), Destatis Häuserpreisindex (GENESIS, Registrierung). | Kaufpreis/Miete als gekennzeichnete Annahmen; Szenarien 100–250 Tsd. €. |
| 5 | Bauzinsen | EZB Data Portal, MFI-Zinsstatistik (kostenlos, ohne Schlüssel). Serie `MIR/M.DE.B.A2C.P.R.A.2250.EUR.N` (DE, Wohnungsbau, Zinsbindung > 10 J., Neugeschäft) – per `ECB_MORTGAGE_SERIES` überschreibbar. **Hinweis:** Der Serien-Key konnte aus der Entwicklungsumgebung nicht live abgerufen werden (Netzwerk gesperrt); bei Fehlermeldung Key im EZB-Portal prüfen. | `/api/rates/mortgage` – optional. Standardannahme 4,04 % (Bundesbank MFI-Zinsstatistik, Effektivzins > 10 J., August 2026). |
| 6 | CSV/Excel-Import | – | Aktiv (Kopfzeilenerkennung, deutsche Formate, Soll/Haben, Windows-1252, .xlsx). |
| 7 | Export/Backup | – | JSON-Backup (validiert), Excel, CSV, PDF. |

## Gesetzliche/marktübliche Annahmen Immobilie

- Grunderwerbsteuer: **Berlin 6,0 %**, **Brandenburg 6,5 %** (seit 07/2015).
- Notar + Grundbuch: ~2,0 % (Annahme, abhängig von Kaufpreis & Grundschuld).
- Makler: Käuferanteil marktüblich 3,57 % inkl. MwSt. (Teilung nach § 656c BGB) – kann entfallen.
- Beleihungswert: Kaufpreis − 10 % Sicherheitsabschlag (Annahme).

## Quellen

- Grunderwerbsteuer 2026: https://finanz-rechner-hub.de/steuer/grunderwerbsteuer/berlin/ · https://finanz-rechner-hub.de/steuer/grunderwerbsteuer/brandenburg/
- Bundesbank Wohnungsbaukredite: https://www.bundesbank.de/de/statistiken/geld-und-kapitalmaerkte/zinssaetze-und-renditen/wohnungsbaukredite-an-private-haushalte-hypothekarkredite-auf-wohngrundstuecke-615036
- Zinswert August 2026: https://www.cash-online.de/a/bauzinsen-auf-mehrjahreshoch-ezb-umfrage-zeigt-folgen-des-zinsentscheids-728863/
- EZB MIR-Datensatz: https://data.ecb.europa.eu/data/datasets/MIR
- Trade-Republic-Transaktionsexport: https://forum.portfolio-performance.info/t/import-trade-republic-csv-transaktionsexport/39126 · https://www.mobiflip.de/trade-republic-bekommt-neue-export-funktion-und-outbank-zieht-sofort-nach/
- Enable Banking Bedingungen: https://enablebanking.com/terms · Changelog: https://enablebanking.com/blog/2026/01/15/enable-banking-changelog-december-2025
- GoCardless Neuanmeldungen: https://dev.to/johnfrandsen/gocardless-bank-account-data-alternatives-what-to-use-when-signups-are-disabled-326d
