# Platzhalter – was vor dem Livegang noch fehlt

Alle Stellen sind auf der Website gelb gestrichelt markiert. Nichts davon wurde erfunden.

## 1. Zentral in `src/config.ts`

| Platzhalter | Wo | Hinweis |
|---|---|---|
| `[BUCHUNGSLINK]` | `BOOKING_URL` | Calendly / Cal.com / Google-Terminbuchung. Solange `#`, führen Buchungs-Buttons zum Kontaktbereich. |
| `[E-MAIL]` | `CONTACT_EMAIL` | z. B. `kontakt@ngcxintelligence.de` |
| `[LINKEDIN_URL]` | `LINKEDIN_URL` | Profil-URL von Kewin |
| `[PREIS_SPRINT]`, `[PREIS_MANAGEMENT]` | `PRICES` | nur relevant, wenn `SHOW_PRICES = true` |
| Preise anzeigen? | `SHOW_PRICES` | aktuell `false` |
| Ansprache | `ANSPRACHE` | `'ihr'` (Standard) oder `'sie'` |
| `[FOTO]` | `FOUNDER.photo` | z. B. `/img/kewin.webp` (Datei nach `public/img/` legen, ca. 800 × 960 px) |

## 2. Startseite – `src/content/texte.ts`

| Platzhalter | Abschnitt |
|---|---|
| `[PLATZHALTER: Zwei bis drei Sätze zu deinem beruflichen Hintergrund …]` | `ueber.paragraphs` (Über NGCX) |
| H1-Formulierung bestätigen | `hero.title` – zwei Alternativen stehen als Kommentar daneben |

## 3. Impressum – `src/pages/impressum.astro`

- `[VOLLER NAME]`
- `[ZUSATZ, z. B. „NGCX“ als Geschäftsbezeichnung]`
- `[STRASSE NR]`, `[PLZ ORT]` – ladungsfähige Anschrift, kein Postfach (ggf. Geschäftsadress-Dienst)
- `[TELEFON]` – zweiter schneller Kontaktweg
- `[USTID]` – optionaler Block, nur falls vorhanden, sonst Block löschen
- `[NAME]`, `[ADRESSE]` – Verantwortlich nach § 18 Abs. 2 MStV
- `[DATUM]` – Stand

## 4. Datenschutz – `src/pages/datenschutz.astro`

- `[VOLLER NAME]`, `[ZUSATZ]`, `[STRASSE NR]`, `[PLZ ORT]`, `[TELEFON]` (wie Impressum)
- `[HOSTING-ANBIETER]` – voraussichtlich Cloudflare Pages
- `[SPEICHERDAUER LOGS]`
- `[E-MAIL-ANBIETER]` – voraussichtlich Google Workspace
- `[BUCHUNGSTOOL]` und `[LINK ZUR DATENSCHUTZERKLÄRUNG DES BUCHUNGSTOOLS]`
- `[BESTÄTIGEN]` (4×) – AVV und DPF-Zertifizierung von Hosting- und E-Mail-Anbieter prüfen
- `[ZUSTÄNDIGKEIT PRÜFEN]` – Aufsichtsbehörde richtet sich nach dem Sitz (eingetragen: Berlin)
- `[DATUM]` – Stand

## 5. AGB – `src/pages/agb.astro`

- `[VOLLER NAME]`, `[STRASSE NR]`, `[PLZ ORT]`
- `[ANGEBOTSBINDUNG]`
- `[ABRECHNUNG SPRINT]`, `[ABRECHNUNG MANAGEMENT]`
- `[ZAHLUNGSZIEL]`
- `[§ 19 UStG JA/NEIN]` – optionaler Block Kleinunternehmerregelung
- `[LAUFZEIT SPRINT]`, `[MINDESTLAUFZEIT]`, `[VERLÄNGERUNG]`, `[KÜNDIGUNGSFRIST]`
- `[DAUER]` – Nachwirkung der Vertraulichkeit
- `[GERICHTSSTAND]`
- `[DATUM]` – Stand

## 6. Vor dem Livegang außerdem

- Alle Rechtstexte rechtlich prüfen lassen (Anwalt oder Generator wie eRecht24 / IT-Recht Kanzlei).
- Kontrast der Primär-Buttons entscheiden (siehe README, Abschnitt „Barrierefreiheit“).
