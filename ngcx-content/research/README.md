# NGCX – Tägliche LinkedIn-Kontaktrecherche

Jeden Morgen eine LinkedIn-Networking-Liste mit 15 neuen, verifizierten Entscheidern. Kewin vernetzt sich **manuell**. Es werden keine automatischen Anfragen und keine Nachrichten verschickt.

## Dateien

| Datei | Zweck |
|---|---|
| `contacts-db.json` | Dauerhafte Datenbank aller jemals geprüften Kontakte (`daily_list` + `excluded`). Grundlage der Dublettenprüfung. |
| `ngcx_db.py` | `check <url/domain>` · `add <json>` (lehnt Dubletten ab) · `report <YYYY-MM-DD>` (Tabelle + Begründungen) · `stats` |
| `daily/YYYY-MM-DD.md` | Tagesreport |
| `../ngcx-kontaktliste.md` | Arbeitsliste für den Networking-Status (wird mit jeder Tagesliste ergänzt) |

## Ablauf pro Tag

1. **Kandidaten finden**: `people_company_search` (Firecrawl). Personen mit `seniority` founder/owner/c_suite/partner, Branchen „IT Services and IT Consulting" / „Software Development", `headcount` 10–50 (danach 5–10, selektiv 50–100), Länder: zuerst Germany, dann Austria und Switzerland. Mit `next_cursor` weiterblättern und Filter variieren (Städte, Keywords wie „Softwareagentur", „Cloud Beratung", „Systemhaus", „Digitalisierung", „Engineering").
2. **Vorfiltern**: jede LinkedIn-URL und Domain mit `python3 ngcx_db.py check …` prüfen. Treffer werden verworfen. Pro Unternehmen ist nur eine Person erlaubt.
3. **Person verifizieren** (Pflicht): `people_company_enrich` mit der `linkedin_url`. Die aktuelle Position muss zur Rolle passen (Founder, Co-Founder, GF, CEO, MD, Managing Partner, Inhaber) und beim genannten Unternehmen liegen. Ist das Profil leer, gilt es nur dann als verifiziert, wenn mindestens 2 unabhängige Quellen denselben Handle und dasselbe Unternehmen nennen. Das wird im Report vermerkt. Sonst wird der Kandidat nicht aufgenommen.
4. **Unternehmen prüfen**: `people_company_enrich` mit `companies` (Domain) → Mitarbeiterzahl, Beschreibung. Es zählt nur Projektgeschäft bzw. Dienstleistung. Produkt- und SaaS-Firmen, Personaldienstleister und Konzerne fallen raus.
5. **Bewerten**: Fit A/B/C, eine individuelle Begründung, Wachstumssignale nur mit Beleg. Empfehlungsabhängigkeit und LinkedIn-Aktivität werden nie als Tatsache behauptet.
6. **Speichern**: Datensätze (auch die ausgeschlossenen mit `exclusion_reason`) über `ngcx_db.py add` eintragen. Danach `report` in `daily/<Datum>.md` übernehmen und die Kontaktliste ergänzen. Dann Commit und Push.
7. **Weniger als 15 verifiziert?** Nur die echten liefern. Niemals auffüllen.

## Offene Hinweise aus früheren Läufen
- fuseki (Essen, 36 MA): aktuelle Geschäftsführung recherchieren. Heiko Dietz ist nur noch Partner.
- HeptaSphere (Hamburg): Geschäftsmodell klären, bevor die Firma aufgenommen wird.
