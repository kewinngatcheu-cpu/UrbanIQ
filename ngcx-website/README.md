# NGCX Website (ngcxintelligence.de)

**Status: Phase 1 – Entwurf zur Ansicht.** Nicht deployed, keine Änderungen an Domain oder DNS.

Statische Website mit [Astro](https://astro.build), reines CSS, keine externen Requests zur Laufzeit.

## Lokal starten

```bash
cd ngcx-website
npm install
npm run dev        # → http://localhost:4321
```

Produktions-Build: `npm run build` (Ausgabe in `dist/`), Vorschau des Builds: `npm run preview`.

## Wo ändere ich was?

| Was | Datei |
|---|---|
| Buchungslink, E-Mail, LinkedIn, Hinweisleiste | `src/config.ts` |
| Preise und Founding-Schalter (`foundingActive`, `foundingSpotsTotal`, `foundingSpotsLeft`, `showSpotsCounterFrom`) | `src/pricing.config.ts` (Tariftexte in den Sprachdateien unter `pricing`) |
| **Alle Texte, Deutsch** | `src/locales/de.json` |
| **Alle Texte, Englisch** | `src/locales/en.json` (gleiche Struktur wie de.json) |
| URLs je Sprache, Anker-IDs der Sektionen | `src/i18n/routes.ts` |
| Seiten-Layouts (für beide Sprachen gemeinsam) | `src/views/` (Home, Pricing, Check) |
| Farben, Schrift, Abstände (Design-Tokens) | `src/styles/tokens.css` |
| Pipeline-Check | `src/views/Check.astro`, Fragen/Texte in den Sprachdateien unter `check` (Original: `assets/pipeline-check.html`) |
| Impressum, Datenschutz, AGB | `src/pages/*.astro` |
| Security-Header (Cloudflare Pages) | `public/_headers` |
| OG-Bild neu erzeugen | `scripts/og-image.html` bearbeiten, dann `npm run og` |

- **Preise ändern:** in `src/pricing.config.ts`. Founding-Programm beenden: `foundingActive = false` oder `foundingSpotsLeft = 0` (Umschalter, Banner, Badge, Streichpreise und Benefits verschwinden automatisch). Freie Plätze anpassen: `foundingSpotsLeft`.

## Zweisprachigkeit

- Deutsch unter `/`, Englisch unter `/en` (`/en/pricing`, `/en/pipeline-check`). Sprachwähler „DE | EN“ oben rechts bzw. im Mobilmenü.
- Erster Besuch: Bevorzugt der Browser kein Deutsch, wird auf Englisch umgeleitet. Die gewählte Sprache wird in `localStorage` (`ngcx-lang`) gemerkt. Englische URLs werden immer respektiert, Suchmaschinen nie umgeleitet.
- Rechtstexte gibt es nur auf Deutsch (maßgeblich); die englische Seite verlinkt sie mit „(German)“.
- Neue Texte immer in **beiden** Dateien unter demselben Schlüssel anlegen.

## Struktur

```
assets/                  Originale: pipeline-check.html, Logo-Screenshot
public/                  Fonts (Manrope, lokal), Logo/Favicon, OG-Bild, robots.txt, _headers
scripts/                 OG-Bild- und Screenshot-Skript
src/config.ts            zentrale Konfiguration
src/locales/             de.json, en.json (alle Texte)
src/i18n/                Sprach-Helfer, URLs und Anker je Sprache
src/views/               Home, Pricing, Check (gemeinsam für DE und EN)
src/pricing.config.ts    Preise und Founding-Programm
src/styles/              tokens.css, global.css
src/layouts/             Base (Header/Footer/SEO), Legal
src/components/          Header, Footer, Button, Card, Chip, Section, CtaBox, FaqItem, Calculator, PipelineVisual …
src/pages/               index, pipeline-check, impressum, datenschutz, agb, 404, sitemap.xml
```

## Datenschutz-Technik

- Keine Cookies, kein Tracking, keine CDNs, keine Google Fonts, keine iframes.
- Pipeline-Check und Rechner rechnen nur im Browser; nichts wird gespeichert oder übertragen.
- Einzige Browser-Speicherung: `sessionStorage`, wenn die Hinweisleiste geschlossen wird.
- E-Mail-Adresse wird per JavaScript zusammengesetzt (Spam-Schutz) mit lesbarem Fallback.

## Barrierefreiheit – offener Punkt

Weißer Text auf `#087BFF` erreicht ca. 4,0 : 1. WCAG AA verlangt für normale Textgröße 4,5 : 1.
Der Button-Ton ist als eigenes Token angelegt: in `src/styles/tokens.css` `--btn-bg: #0069E0;` setzen
(≈ 5,1 : 1), dann ist es behoben, ohne die Akzentfarbe sonst zu ändern.

## Screenshots & Klicktest

Bei laufendem Dev-Server: `npm run shots` → `screenshots/` (375 und 1440 px, klickt den Pipeline-Check durch,
meldet Fremd-Requests). Andere Breiten: `WIDTHS=375,768,1440 npm run shots`.

## Deployment

Erst in Phase 2 (Cloudflare Pages, Build `npm run build`, Output `dist`). Anleitung folgt dann.
