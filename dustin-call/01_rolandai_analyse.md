# Roland AI / EstateFlow – Website-Analyse

**Analysiert:** https://rolandai.de am 24.11.2026
**Gelesene Seiten:** Startseite (inkl. Textfassung des Produktfilms, Preis, FAQ), `/funktionen/anfragen-automatisieren`, `/funktionen/besichtigungen`, `/funktionen/interessenten-matching`, `/funktionen/nachfassen`, `/funktionen/ki-expose`, `/integrationen/propstack`, `/integrationen/onoffice`, `/integrationen/openimmo`, `/sicherheit`, `/impressum`, `/datenschutz`, `/nutzungsbedingungen`, `/registrieren`, `/anmelden`, `sitemap.xml`, `robots.txt`
**Nicht vorhanden (404):** `/preise`, `/faq`, `/blog`, `/ueber-uns`, `/about`, `/kontakt`. Preis und FAQ stehen als Abschnitte auf der Startseite. Einen Blog und eine „Über uns“-Seite gibt es nicht.

> Konvention: Alles ohne Kennzeichnung steht so auf der Website. Meine Bewertungen sind mit **Einschätzung:** markiert.

---

## 1. Kurzfazit

Roland AI ist die Firma, das Produkt heißt **EstateFlow**. Es ist ein „KI-Agent für Immobilienmakler“. Die KI liest eingehende Interessenten-Anfragen (Portal, Website, Postfach, WhatsApp), ordnet sie dem passenden Objekt zu und schreibt Entwürfe für Antworten, Besichtigungstermine, Follow-ups und Exposés. **Versendet wird erst, wenn ein Mensch freigibt** („Ohne Ihre Freigabe geht nichts raus“). Zielgruppe sind Maklerbüros, bei denen regelmäßig ähnliche Anfragen eingehen. Das Versprechen lautet „Weniger Handarbeit bei Immobilienanfragen“, zum Preis von 99 €/Monat pro Büro und mit 14 Tagen kostenlosem Test.

**Einschätzung:** Das Produkt ist deutlich weiter und durchdachter als „ein bisschen KI-SaaS“. Auf der Website gibt es aber **null Social Proof**. Sie ist laut Sitemap und Impressum seit dem **16.11.2026** online, also etwa eine Woche alt. Dustin hat ein Produkt, aber offenbar noch keinen Markt. Genau da setzt du an.

---

## 2. Produkt / Leistungen

### Kern-Workflow (5 Schritte, so auf der Website)
1. **Anfrage kommt an** (Portal, Website, Postfach, WhatsApp)
2. **Kontext verstanden:** Person, Objekt, Anliegen, Zeitraum, Budget und Haushalt werden extrahiert, jeweils mit Angabe, aus welchem Satz sie stammen. Was fehlt, wird als „nicht genannt“ markiert.
3. **Objekt gefunden:** Zuordnung mit Begründung („Belegt / Wahrscheinlich / Unsicher“). Bei unsicherer Zuordnung entscheidet der Makler.
4. **Antwort vorbereitet:** Entwurf auf Basis von Objektdaten und Kalender. Aussagen ohne Beleg (z. B. „Ein Hund ist erlaubt“) **sperren die Freigabe**.
5. **Freigabe durch den Menschen**, danach geht es mit Termin, Exposé und Nachfassen weiter.

### Module / Funktionen
| Modul | Was es laut Website macht |
|---|---|
| **Anfragen automatisieren** | Auswerten, Objekt zuordnen, Antwortentwurf, Prüfung gegen Objektdaten |
| **Besichtigungen** | Terminvorschläge nur aus freien Kalenderzeiten, Buchungslink für Interessenten, Vorbereitung vor dem Termin, Nachbereitung aus Notiz oder **Sprachnotiz** (wird zu Aufgaben, Antwort, Feedback-Anfrage) |
| **Interessenten-Matching** | Suchprofil aus jeder Anfrage. Ein neues Objekt wird gegen alle offenen Suchen gerechnet. Kein doppeltes Anbieten. Absagen mit bis zu 2 Alternativen. Reaktivierung früherer Interessenten unter Beachtung von Werbesperren und Einwilligung |
| **Nachfassen** | Erkennt offene Vorgänge, Fälligkeiten in Bürozeit. Heikle Fälle (Preisverhandlung, Beschwerde, Rechtsfrage) landen unter „Aufmerksamkeit“ |
| **KI-Exposé** | Exposé-Text aus Objektdaten, jede Angabe geprüft. PDF und Exposé-Link ohne Anmeldung mit **Öffnungs-Tracking**. Hinweise am Objekt (fehlende Bilder, Energieangaben, Preisvergleich) |
| **Außerdem** | Eigentümerbericht, Unterlagen anfordern (geschützter Link), Kontakte-Import (CSV/Excel/vCard/OpenImmo), „Bürowissen“ (Textbausteine), Team & Vertretung (Rollen, Abwesenheit), Kennzahlen (Reaktionszeit-Median, Anfragen/Tag, Freigabequote, Termine/Objekt) |

### Integrationen
- **Eingang/Versand:** Google Workspace, Microsoft 365, IMAP/SMTP, Website-Formular, WhatsApp Business
- **Objektdaten:** OpenImmo (XML/ZIP), CSV/Excel, Import von der Website, JSON-Feed, PDF-Exposé
- **Kalender:** Google, Microsoft 365
- **Maklersoftware (optional):** propstack (API-Schlüssel), onOffice enterprise (API). Abgleich in beide Richtungen, Konflikte werden angezeigt statt still überschrieben.
- **Wichtig:** *„eine direkte Portalanbindung gibt es nicht“*. ImmoScout24 und Immowelt laufen über E-Mail-Weiterleitung.

### Technologie (aus Datenschutzerklärung und Seitenquelltext)
- Frontend: **Next.js** (`/_next/`-Pfade im Quelltext), Deutsch/Englisch, Hell/Dunkel-Modus
- Hosting: **Vercel** (Frankfurt), Datenbank/Auth/Storage: **Supabase**
- KI: **ausschließlich Anthropic API** („aktuell die Modelle Claude Opus 5.5 und Claude Sonnet 5.5“), laut Website „im Quellcode an genau einer Stelle gekapselt und austauschbar“
- Sprachnotizen: **AssemblyAI** (EU-Rechenzentren), Mail: **Mailgun** (EU), Zahlung: **Stripe**
- Sicherheit: Mandantentrennung „in der Datenbank, nicht in der Oberfläche“, Token verschlüsselt (AES-256-GCM), HSTS, minimale Google-Scopes (nur `gmail.send` und `calendar.events`, kein Lesezugriff aufs Postfach)
- Reichweitenmessung ohne Cookies

---

## 3. Zielgruppe

**Fakten:**
- „Für Maklerbüros, die mehr Anfragen bekommen, als sie von Hand bearbeiten können“ (Login-Seite)
- Nutzungsbedingungen: „richtet sich an Unternehmen (Immobilienmakler und Immobilienunternehmen), nicht an Verbraucher“, also nur B2B
- **Passt gut, wenn:** Anfragen regelmäßig reinkommen, Rückfragen sich ähneln, viel Zeit ins Abtippen geht, mehrere Personen antworten
- **Weniger passend, wenn:** wenige Anfragen (Telefon), überwiegend individuelle Verhandlungen, Wunsch nach vollautomatischem Versand
- Ausdrücklich: lohnt sich „nicht ab einer Mindestzahl, sondern bei einem bestimmten Arbeitsablauf“
- **Keine Angaben** zu Bürogröße, Region, Wohnen vs. Gewerbe

**Einschätzung:**
- Alle Beispiele sind **Mietwohnungen** („1.240 € kalt“, „Kaltmiete“), eine davon in **Potsdam**. Der implizite Sweet Spot sind **Vermietungsmakler bzw. Büros mit Vermietungsanteil in Ballungsräumen**, wo pro Inserat sehr viele Anfragen kommen. Bei Gewerbe und Kauf auf hohem Niveau passt das Produkt schlechter (individueller, weniger Volumen).
- „Mehrere Personen antworten“, Team/Vertretung, Rollen: Das Produkt ist eher auf **Büros mit 2–15 Leuten** gebaut als auf Solo-Makler (die aber bei 99 € auch kaufen könnten).
- Auch Hausverwaltungen und Wohnungsunternehmen mit Vermietung könnten passen („Immobilienunternehmen“ in den AGB). **Im Call klären.**
- **IT-Consulting, IT-Audit und Digital Transformation (laut LinkedIn) kommen auf der Website nirgends vor.** Die Seite ist zu 100 % EstateFlow. Ob es dafür Kunden oder eine eigene Zielgruppe gibt, ist offen.

---

## 4. Preismodell

**Fakten:**
- **EstateFlow Professional: 99 € pro Monat zzgl. USt., je Unternehmen**, beliebig viele Nutzer und Objekte
- **14 Tage kostenlos testen, ohne Zahlungsdaten.** Die Testphase endet automatisch, Abo wird selbst in den Einstellungen abgeschlossen
- Monatlich kündbar, keine Einrichtungsgebühr
- Kostenschutz in der Testphase: max. 1.500 KI-Auswertungen pro Monat
- Nur **ein** Paket, kein Enterprise-Tier, kein Jahresrabatt sichtbar

**Einschätzung:** 99 € flat für unbegrenzt viele Nutzer ist **sehr günstig** und für Makler eine Impulskauf-Schwelle. Die Kehrseite: Für nennenswerten Umsatz braucht er **viele** Kunden (100 Kunden ≈ 9.900 €/Monat). Dazu kommen KI-API-Kosten pro Kunde. Ein persönlicher Vertrieb pro Kunde rechnet sich bei 99 € kaum. Er braucht also einen **effizienten, skalierbaren Akquiseweg**. Nicht im Call bewerten, aber im Hinterkopf behalten: Es erklärt, warum er Hilfe beim Vertrieb sucht.

---

## 5. Positionierung & USP

**Fakten (Botschaften der Website):**
- „Weniger Handarbeit bei Immobilienanfragen“ / „Weniger Handarbeit. Mehr Überblick.“
- **Human-in-the-loop als Kernversprechen:** „Ohne Ihre Freigabe geht nichts raus“, „Jede Freigabe trägt einen Namen“
- **Nachprüfbarkeit:** Jede Angabe nennt ihre Quelle, unbelegte Zusagen werden gesperrt
- „EstateFlow ist ein eigenständiges Produkt“, funktioniert **ohne** Maklersoftware, ergänzt aber propstack/onOffice
- Transparenz bei Datenschutz (sagt offen, dass die KI in den USA läuft)

**Einschätzung – USP:** Kein Chatbot, der „irgendwas“ antwortet, sondern ein **kontrollierter Assistent mit Belegprüfung**. Das ist ein starker, ehrlicher Gegenpol zur Angst vieler Makler vor halluzinierender KI. Dazu kommt der Preis.

**Einschätzung – naheliegende Wettbewerber (vor dem Call nicht verifiziert):**
- **Maklersoftware/CRMs mit eigenen Automatisierungs- und KI-Funktionen:** propstack, onOffice, FLOWFACT. Gleichzeitig Integrationspartner *und* potenzielle Konkurrenz, falls sie das Feature selbst bauen.
- **Generische KI-Tools:** Makler, die einfach ChatGPT/Claude oder Textbausteine nutzen. Das ist der eigentliche Status quo.
- **Spezialisierte KI-Tools für Makler** (KI-Exposé-Generatoren, Lead-Qualifizierungs-Chatbots, Telefon-KI-Assistenten). Davon gibt es in DACH inzwischen viele.
- **Menschliche Alternativen:** Assistenz, Werkstudent, Büroservice.
→ Im Call fragen, wen *er* als Konkurrenz sieht.

---

## 6. Reifegrad

**Fakten:**
- **Keine** Kundenlogos, Testimonials, Fallstudien, Kundenzahlen oder Bewertungen
- Alle Beispiele ausdrücklich als „erfundene Beispieldaten“ gekennzeichnet
- **Produktfilm (1:40 Min.)** mit echten Aufnahmen der Oberfläche, KI-generierte Stimme
- Self-Service-Registrierung und Login funktionieren (Formulare vorhanden, „Ohne Passwort anmelden“)
- Website, Impressum, Datenschutz und AGB tragen alle „Stand: 16. November 2026“, die Funktionsseiten haben `lastmod 2026-11-16`
- Sehr ausführliche Datenschutzerklärung inkl. Google-API-Limited-Use-Passus

**Einschätzung:**
- **Produktseitig: deutlich über MVP.** Funktionsumfang, Integrationen, Rechtetrennung und Kennzahlen wirken wie ein fertiges v1-Produkt. Der Google-Limited-Use-Passus deutet darauf hin, dass er sich auf die Google-OAuth-Verifizierung vorbereitet.
- **Marktseitig: Pre-Traction / Launch-Phase.** Kein einziger Beleg für zahlende Kunden. Die Website ist eine Woche alt.
- Das Risiko: **„Build first, sell later“.** Viel Feature-Tiefe, bevor validiert ist, welche 1–2 Funktionen Makler wirklich kaufen.

---

## 7. Vertriebs-Setup

**Fakten:**
| Element | Vorhanden? |
|---|---|
| Primärer CTA | ✅ „14 Tage kostenlos testen“ (mehrfach, auch im Header) |
| Sekundärer CTA | ✅ „Vorführung per E-Mail anfragen“ (mailto an dustin@rolandai.de), „Anrufen: 0176 …“ |
| Ablauf/Demo | ✅ interaktive Beispielszene und Produktfilm |
| FAQ / Einwandbehandlung | ✅ gut (Datenschutz, Fehler der KI, Absender, nach der Testphase) |
| „Für wen / nicht für wen“ | ✅ ehrlich und klar |
| Buchungstool (Calendly o. ä.) | ❌ nicht gefunden, Demo nur per Mail oder Telefon |
| Lead-Magnet (Checkliste, Rechner, Whitepaper) | ❌ |
| Newsletter / Blog / Content | ❌ |
| Social Links (LinkedIn etc.) | ❌ nicht im Footer |
| Kontaktformular | ❌ nur mailto und Telefon |
| Social Proof | ❌ |
| Persönliches Gesicht | ⚠️ Name „Dustin Roland“ wird genannt, aber kein Foto und keine Story |

**Einschätzung:** Die Website ist auf **Self-Service (Product-led)** ausgelegt: Makler sollen selbst registrieren, Postfach verbinden, testen. Inhaltlich ist das sehr gut gemacht. Für die Zielgruppe ist es aber **anspruchsvoll**: Makler sind meist nicht techaffin, haben wenig Zeit und vertrauen eher Empfehlungen und persönlichen Gesprächen. Postfach-Weiterleitung und Objektimport sind eine echte Hürde. Ohne Social Proof und ohne niedrigschwellige Demo-Buchung verpufft vermutlich ein Großteil des Traffics. **Traffic gibt es aktuell vermutlich kaum**, denn es gibt keinen Content und keine Social-Kanäle.

---

## 8. Rechtliches / Formales

**Fakten (Impressum):**
- Anbieter: **„Dustin Roland – Roland AI“**, Hans-Paasche-Straße 6, **14469 Potsdam**
- „Kein Eintrag im Handelsregister“
- Kontakt: dustin@rolandai.de, Mobilnummer 0176 84523169
- Datenschutzerklärung mit Rollen (Roland AI ist Auftragsverarbeiter nach Art. 28 DSGVO für die Kundendaten), Unterauftragsverarbeitern und Angaben zum Drittlandtransfer
- Nutzungsbedingungen: B2B only, Haftungsbegrenzung, keine Verfügbarkeitszusage (kein SLA)

**Einschätzung:**
- Rechtsform: faktisch **Einzelunternehmen** (keine GmbH/UG). Standort **Potsdam**, nicht Berlin.
- Die Preise sind „zzgl. USt.“, im Impressum steht aber **keine USt-IdNr.** Das ist nicht zwingend ein Fehler (Pflicht nur, wenn eine vorhanden ist), könnte aber auf eine sehr frühe Gründungsphase hindeuten. Nicht im Call thematisieren, ist nur Kontext.
- Einen **AV-Vertrag (Auftragsverarbeitungsvertrag)** werden Makler einfordern. Ob er als Dokument existiert, ist auf der Website nicht sichtbar.
- **KI-Verarbeitung in den USA (Anthropic)** wird offen kommuniziert. Das ist ehrlich, aber ein Thema, das bei manchen deutschen Maklern **Einwände** auslösen wird.

---

## 9. Stärken & Schwächen aus Vertriebssicht

### Stärken
1. **Klarer, greifbarer Nutzen:** Weniger Abtippen, schneller antworten („Wer schnell antwortet, bekommt die Besichtigung“). Makler verstehen das sofort.
2. **Vertrauensarchitektur:** Freigabepflicht, Belegprüfung, ehrliches „Kann sich die KI irren? Ja.“ Das nimmt die Hauptangst vor KI.
3. **Niedrige Einstiegshürde beim Preis:** 99 €, unbegrenzte Nutzer, Test ohne Zahlungsdaten, monatlich kündbar.
4. **Andockfähig:** Funktioniert ohne Software, aber mit propstack/onOffice. Damit ist die Zielgruppe nach eingesetzter Software filterbar.
5. **Starke Inhalte und Klarheit:** „Für wen / nicht für wen“, FAQ und Film sind besser als bei vielen etablierten Anbietern.

### Schwächen
1. **Null Social Proof.** Kein Logo, kein Zitat, keine Zahl. Bei konservativen Maklern ist das ein Deal-Breaker.
2. **Keine Demo-Buchung und kein Lead-Magnet.** Wer nicht sofort testen will, hat nur mailto oder Telefon.
3. **Self-Service-Onboarding ist für Makler eine hohe Hürde** (Weiterleitung, Import, Kalender verbinden).
4. **Feature-Überladung:** Ca. 15 Funktionen, aber keine klare „Killer-Funktion“ für die erste Ansprache. In der Ansprache muss man **eine** Pain-Story wählen.
5. **Kein Absender-Gesicht und keine Reichweite:** Kein Foto, keine Story, kein LinkedIn-Link, kein Content. Die Marke heißt „EstateFlow“, die Firma „Roland AI“, und auf LinkedIn steht dazu noch IT-Consulting. Die Positionierung ist dadurch uneinheitlich.

---

## 10. Offene Punkte (im Call klären)

1. **Kunden:** Gibt es schon zahlende Kunden oder Testnutzer? Wie viele? Wer?
2. **Herkunft der Idee:** Warum Makler? Gibt es einen persönlichen Bezug (Familie, Nebenjob, Netzwerk in Potsdam)?
3. **IT-Consulting / Audit / Digital Transformation:** Ist das aktiv und bringt es Umsatz, oder ist es ein Überbleibsel? Worauf will er sich fokussieren?
4. **Ziel-ICP:** Vermietung vs. Verkauf? Bürogröße? Region (Potsdam/Berlin)? Auch Hausverwaltungen?
5. **Bisherige Akquise:** Was hat er schon versucht (Kaltakquise, LinkedIn, Netzwerk, Portale)? Mit welchem Ergebnis?
6. **Ziel:** Wie viele Kunden in 3 Monaten? Was ist „Erfolg“ für ihn?
7. **Onboarding:** Macht er Onboarding persönlich? Wie lange dauert es bis zum ersten Aha-Moment?
8. **Wer hat gebaut?** Allein? Mit KI-Coding-Tools? Wie viel Zeit pro Woche fließt hinein?
9. **Datenschutz-Einwände:** Hat er schon Feedback zu „KI in den USA“ bekommen? Gibt es einen AV-Vertrag?
10. **Zeitbudget und Lebenssituation:** Studium, Nebenjob, wie viele Stunden pro Woche für Roland AI und für den Tausch mit dir?
11. **Langfristige Vision:** Lifestyle-SaaS, VC-Startup, Exit, Agentur?

---

## 11. Ansatzpunkte für deine Hilfe

1. **ICP schärfen:** Aus „Maklerbüros“ wird ein konkretes Zielsegment (z. B. Vermietungsbüros mit X Mitarbeitern in Berlin/Brandenburg, mit vielen aktiven Inseraten, ggf. Nutzer von propstack/onOffice).
2. **Leadliste 50–100 Makler:** Recherchierte, öffentlich zugängliche Geschäftskontakte (Inhaber/Geschäftsführung) inkl. Signalen wie Anzahl Inserate und eingesetzte Software, soweit öffentlich erkennbar.
3. **Ansprachekonzept:** **Eine** klare Pain-Story statt 15 Features (z. B. „Antwortzeit auf Portalanfragen“). Kanal-Mix passend zur Rechtslage (siehe DSGVO/UWG-Hinweis im Skript).
4. **Pilotkunden-/Referenzlogik:** Die ersten 3–5 Kunden als Design-Partner gewinnen, Testimonials und eine erste Mini-Fallstudie einsammeln. Das behebt die größte Website-Schwäche.
5. **Demo-Prozess:** Ein klarer nächster Schritt (z. B. 20-Min-Demo mit Terminbuchung) statt nur mailto. Begleitete Einrichtung statt reinem Self-Service.
6. **Pipeline-Transparenz:** Wöchentliches Reporting, damit er sieht, was funktioniert (Antwortquoten, Gespräche, Tests).
7. **Einwand-Sammlung:** Datenschutz/USA, „Ich hab schon onOffice“, „KI macht Fehler“. Systematisch sammeln und Antworten aufbauen.

---

## 12. Tech-Kompetenz-Einschätzung (für Tausch und Partner-Test)

**Einschätzung:**
- **Stark.** Ein Mandanten-fähiges SaaS mit OAuth-Anbindungen (Google, Microsoft), IMAP/SMTP, WhatsApp Business, zwei CRM-APIs (propstack, onOffice), OpenImmo-Import, Stripe-Billing, Sprachtranskription, LLM-Pipeline mit Belegprüfung, i18n und Dark Mode baut man nicht nebenbei. Die Architekturentscheidungen sind sauber dokumentiert: KI-Anbieter „an genau einer Stelle gekapselt“, Token-Verschlüsselung, Mandantentrennung in der Datenbank, minimale OAuth-Scopes.
- **Stack passt zu deinen Bedürfnissen:** Next.js/Vercel heißt, dass er Website-Feinschliff wahrscheinlich schnell erledigen kann. Supabase, Mail-Pipelines und LLM-APIs bedeuten, dass er Automatisierungen (z. B. Lead-Anreicherung, Reporting, E-Mail-Workflows) bauen kann.
- **Produkt- und Rechtsdenken:** Die Datenschutzerklärung, „Für wen / nicht für wen“ und der Umgang mit Einwilligung bei Reaktivierung zeigen Sorgfalt und B2B-Verständnis.
- **Vorbehalt:** Ob er das allein gebaut hat und wie viel davon KI-gestütztes Coding ist, lässt sich von außen nicht beurteilen. → Im Call locker nachfragen, z. B. „Wie lange hast du daran gebaut?“ oder „Was war technisch das Kniffligste?“.
- **Für den Partner-Test:** Profil „starker Builder, Vertrieb noch offen“. Das ist **komplementär** zu dir. Die Kehrseite: Builder neigen dazu, weiterzubauen statt zu verkaufen, und haben oft wenig Zeit für fremde Projekte. Achte im Call darauf, ob er **Vertrieb ernst nimmt** und ob er **für deine Tech-Aufgabe wirklich Zeit freimacht**.
