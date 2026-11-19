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
| Buchungslink, E-Mail, LinkedIn, Preise an/aus, Ansprache ihr/Sie, Hinweisleiste | `src/config.ts` |
| Alle Texte der Startseite (je ihr- und Sie-Variante) | `src/content/texte.ts` |
| Farben, Schrift, Abstände (Design-Tokens) | `src/styles/tokens.css` |
| Pipeline-Check | `src/pages/pipeline-check.astro` (Original: `assets/pipeline-check.html`) |
| Impressum, Datenschutz, AGB | `src/pages/*.astro` |
| Security-Header (Cloudflare Pages) | `public/_headers` |
| OG-Bild neu erzeugen | `scripts/og-image.html` bearbeiten, dann `npm run og` |

- **Preise aktivieren:** in `src/config.ts` `SHOW_PRICES = true` und `PRICES` ausfüllen.
- **Auf „Sie“ umstellen:** in `src/config.ts` `ANSPRACHE = 'sie'`. (Der Pipeline-Check bleibt textlich beim „ihr“.)

## Struktur

```
assets/                  Originale: pipeline-check.html, Logo-Screenshot
public/                  Fonts (Manrope, lokal), Logo/Favicon, OG-Bild, robots.txt, _headers
scripts/                 OG-Bild- und Screenshot-Skript
src/config.ts            zentrale Konfiguration
src/content/texte.ts     Texte
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
