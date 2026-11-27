# OUR SUMMER ESCAPE 2027 · Joanna × Kewin

*Two perspectives. Fifteen questions. One unforgettable summer.*

Eine anonyme Couple-Travel-Experience: Joanna und Kewin beantworten unabhängig voneinander 15 Fragen.
Eine Matching Engine ermittelt daraus **Joannas Top 3**, **Kewins Top 3** (jeweils nur privat sichtbar)
und die **drei besten gemeinsamen Reiseziele** – plus Wildcard und finale Destination – aus einer
Datenbank mit **97 konkreten Destinationen** in 26 Ländern.

> Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Motion (Framer Motion) · Supabase/PostgreSQL · Leaflet · Vercel

---

## Inhalt

1. [Schnellstart (lokal)](#1-schnellstart-lokal)
2. [Was du selbst erledigen musst (Deployment)](#2-was-du-selbst-erledigen-musst-deployment)
3. [Ablauf: Demo → Start → Reveal](#3-ablauf-demo--start--reveal)
4. [Architektur](#4-architektur)
5. [Sicherheit & Anonymität](#5-sicherheit--anonymität)
6. [Destination-Datenbank & Datenstatus](#6-destination-datenbank--datenstatus)
7. [Matching Engine](#7-matching-engine)
8. [Live-Recherche](#8-live-recherche)
9. [Tests](#9-tests)
10. [Eure Fotos](#10-eure-fotos)

---

## 1. Schnellstart (lokal)

```bash
cd summer-escape
npm install
cp .env.example .env.local      # APP_SECRET + ADMIN_PASSWORD eintragen
npm run dev                     # http://localhost:3000
```

Ohne Supabase-Variablen speichert die App lokal in `summer-escape/.data/store.json` (nur für die Entwicklung).

| Seite | Zweck |
|---|---|
| `/` | Landingpage |
| `/demo` | Demo mit **Beispieldaten** (6 Testszenarien) + Demo-Fragebogen (speichert nichts) |
| `/explore` | Destination Atlas – interaktive Weltkarte aller 97 Ziele |
| `/admin` | Umfrage starten/pausieren, Antworten zurücksetzen, Zugangslinks erstellen |
| `/p/<token>` | Persönlicher Bereich (nur mit privatem Link) |
| `/p/<token>/survey` · `/profile` · `/reveal` | Umfrage · privates Profil · gemeinsame Auswertung |

---

## 2. Was du selbst erledigen musst (Deployment)

Ich habe alles vorbereitet – diese Schritte brauchen deine Accounts:

### a) Supabase (Datenbank) – ca. 5 Minuten
1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt anlegen (Region z. B. *Frankfurt*).
2. **SQL Editor** → Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → *Run*.
3. **Project Settings → API**: `Project URL` und den **`service_role`**-Key kopieren.
   ⚠️ Den `service_role`-Key niemals weitergeben oder im Browser verwenden – er gehört nur in Vercel.

### b) Vercel (Hosting) – ca. 5 Minuten
1. Auf [vercel.com](https://vercel.com) → *Add New Project* → dieses GitHub-Repository importieren.
2. **Root Directory: `summer-escape`** (wichtig – das Repo enthält noch eine andere App).
3. Unter **Environment Variables** setzen:

| Variable | Wert |
|---|---|
| `APP_SECRET` | Zufallswert, z. B. Ausgabe von `openssl rand -base64 48` (mind. 32 Zeichen). **Nie mehr ändern**, sonst sind Antworten unlesbar. |
| `ADMIN_PASSWORD` | Dein Admin-Passwort (mind. 10 Zeichen) |
| `SUPABASE_URL` | aus Schritt a) |
| `SUPABASE_SERVICE_ROLE_KEY` | aus Schritt a) |
| `NEXT_PUBLIC_SITE_URL` | optional, z. B. `https://our-summer-escape.vercel.app` |

4. *Deploy*. Danach `/admin` öffnen – es dürfen **keine gelben Warnungen** mehr erscheinen.

### c) Fotos
Eure zwei Originalfotos nach `summer-escape/public/couple/` legen (siehe [Abschnitt 10](#10-eure-fotos)), committen, fertig.

---

## 3. Ablauf: Demo → Start → Reveal

1. **Vorbereitung (Standard):** Die Umfrage ist *nicht* gestartet. Persönliche Links zeigen „Your escape opens soon“,
   Speichern ist serverseitig gesperrt. Alles ausprobieren über `/demo` (nur Beispieldaten).
2. **Links erzeugen:** `/admin` → bei Joanna und Kewin *Erstellen*. Der Link wird **nur einmal** angezeigt
   (gespeichert wird nur ein Hash) → kopieren und jeweils nur an die richtige Person schicken.
3. **Starten:** `/admin` → *Umfrage starten*. Erst jetzt werden Antworten angenommen.
4. **Ausfüllen:** Autosave (Server + lokal), Zurück/Weiter, Fortschritt, Review-Seite, finale Bestätigung.
   Nach dem Abschicken: Antworten gesperrt, privates Profil (eigene Top 3) freigeschaltet.
5. **Warten:** Status zeigt nur „One more perspective is missing.“ – nie, *wer* fehlt oder was geantwortet wurde.
6. **Reveal:** Sobald beide abgeschickt haben: „Your summer destination is waiting.“ → Reveal-Experience
   (Part 1 Two Perspectives · Part 2 Compatibility · Part 3 Top 3 · Part 4 Wildcard · Part 5 Final Destination · Karte).

**Admin-Funktionen:** Starten/Pausieren · Antworten zurücksetzen (Bestätigung mit `RESET`) · Link neu erstellen
(alter Link sofort ungültig, Antworten bleiben erhalten).

---

## 4. Architektur

```
summer-escape/
├─ supabase/schema.sql              Tabellen, RLS, Sperr-Trigger
├─ scripts/e2e.mjs                  End-to-End-Test im emulierten iPhone
└─ src/
   ├─ lib/
   │  ├─ survey/questions.ts         Die 15 Fragen (reine Daten)
   │  ├─ survey/answers.ts           Validierung/Sanitizing, Vollständigkeit
   │  ├─ destinations/data.ts        97 Destinationen (Schema: types.ts)
   │  ├─ destinations/derived.ts     August-Wetter-Score, Erreichbarkeit, Formatierung
   │  ├─ destinations/images.ts      Bildbibliothek (Unsplash, geprüft)
   │  ├─ engine/profile.ts           Antworten → Präferenzprofil (Mapping-Tabelle)
   │  ├─ engine/score.ts             Individuelles & Couple-Scoring
   │  ├─ engine/compat.ts            6 Kompatibilitätswerte
   │  ├─ engine/results.ts           View-Models (nur aggregierte Daten)
   │  ├─ demo.ts                     Beispielprofile & Testszenarien
   │  └─ server/                     NUR serverseitig ("server-only")
   │     ├─ crypto.ts                Token, HMAC, AES-256-GCM, Session-Signatur
   │     ├─ store.ts                 Supabase / Datei / Memory
   │     ├─ service.ts               Zugriffskontrolle + Geschäftslogik
   │     ├─ admin-auth.ts            Admin-Login, Rate-Limit
   │     └─ live.ts                  Live-Recherche-Provider
   ├─ app/                           Seiten & API-Routen
   └─ components/                    UI: survey/, results/, map/, admin/
```

---

## 5. Sicherheit & Anonymität

- **Keine Registrierung, keine personenbezogenen Daten** außer den zwei Vornamen.
- **Zugangstoken:** 256 Bit Zufall (`crypto.randomBytes`), in der DB nur als HMAC-SHA256-Hash.
- **Antworten verschlüsselt** (AES-256-GCM, Schlüssel aus `APP_SECRET` abgeleitet) – auch wer die Datenbank sieht, liest keine Antworten.
- **Supabase RLS aktiv ohne Policies** → der öffentliche Key kann nichts lesen; nur der Server (Service-Role) greift zu.
- **Serverseitige Zugriffskontrolle:** jede Anfrage löst den Token auf dem Server auf; man kann nur *eigene* Antworten lesen/schreiben.
- **Gemeinsames Ergebnis nur aggregiert** und nur wenn beide abgeschickt haben. Keine API liefert Antwortdaten der anderen Person;
  die Status-API liefert ausschließlich `phase`, eigenen `status` und `sharedReady`.
- **Abgeschickt = gesperrt** (in der App *und* per DB-Trigger).
- **Admin zeigt bewusst keinen Fortschritt einzelner Personen** und keine Antworten. Hinweis: Als Betreiber hast du technisch
  Zugriff auf die Server-Secrets – die App selbst zeigt Antworten aber nirgends an.
- Admin-Session als signiertes `httpOnly`/`SameSite=strict`-Cookie, Login-Rate-Limit, Origin-Prüfung bei schreibenden Requests.
- Header: `Referrer-Policy: no-referrer` (private Links leaken nicht), `noindex`, `X-Frame-Options: DENY`, `Cache-Control: no-store` für private Seiten.
- Freitext („Was möchtest du auf keinen Fall erleben?“) wird nur serverseitig als Ausschlusskriterium ausgewertet, nie angezeigt.

---

## 6. Destination-Datenbank & Datenstatus

97 konkrete Ziele (alle geforderten 90 + Naxos, Milos, Kefalonia, Formentera, Bali, Sansibar, Sri Lanka Ostküste), jeweils mit
geeigneten Urlaubsregionen/Orten, 13 redaktionellen Bewertungen (0–100), Klima-Normalwerten für August, Anreise ab BER,
Transfer, Kostenschätzung, Tags, Highlights und ehrlichen Hinweisen (z. B. Ksamil-Anreise, Dubai-Hitze, Andamanensee-Monsun).

**Datenstatus** – jede Feldgruppe trägt einen Status (`Verifiziert` / `Geschätzt` / `Noch nicht verfügbar`):

| Daten | Status | Quelle |
|---|---|---|
| Bewertungen (Strand, Wasser, Hotels, …) | Geschätzt | redaktionelle Einschätzung |
| August-Klima (Ø Max, Regentage, Meer) | Geschätzt | ungefähre langjährige Klimanormalwerte |
| Flugzeit, Direktflug-Lage, Transfer | Geschätzt | typische Werte – **vor Buchung prüfen** |
| Kosten für zwei | Geschätzt | illustrative Spanne, **kein Angebot** |
| Live-Klima (Open-Meteo), Reisehinweise (AA) | Live + Zeitstempel | nur bei Abfrage |
| Flug-/Hotelpreise, Verfügbarkeiten | Noch nicht verfügbar | kein Anbieter verbunden |

Es werden **keine aktuellen Preise, Flugpläne oder Wetterprognosen erfunden**.

**Abgeleitete, transparente Scores** (`derived.ts`):
- *Wetter im August:* Ideal 27–32 °C; Abzüge für Hitze (stark ab 36 °C), Regentage (−3,5/Tag), kühles Meer, Monsun (−12), Taifun (−10), Schwüle, Wind, Südwinter.
- *Erreichbarkeit:* Gesamtanreise (Flug inkl. Umstieg + Ø Transfer) – 100 bis 3,5 h, −7,5 je weitere Stunde, Abzug ohne Direktverbindung. Zusätzlich wird der Anteil der Reisezeit an den 7 Tagen angezeigt.

---

## 7. Matching Engine

**1. Profil** (`profile.ts`): Jede Person startet mit der gemeinsamen Ausgangsbasis (Sonne, Strand, Türkis, Pool, Romantik, Restaurants,
Abendstimmung, etwas Musik, Ausflüge, nicht überfüllt). Jede Antwort addiert Gewicht auf ~29 Dimensionen; Slider skalieren
(z. B. Strandwichtigkeit ×0,5–1,6). Budget, Transfertoleranz, Muss-Kriterien und Ausschlusswünsche (Stichwort-Erkennung im Freitext) werden separat geführt.

**2. Individuell** (`score.ts`): 60 % Präferenz-Fit (inkl. Moodboard-Bonus) · 14 % Budget · 12 % August-Wetter · 9 % Erreichbarkeit
(gewichtet nach Transfertoleranz) · 5 % allgemeine Eignung – minus Abzüge für verfehlte Muss-Kriterien, Ausschlusswünsche,
Erlebnis-Level und Massentourismus-Sensibilität. Gewichte passen sich an (z. B. „Warmes Wetter“ als Muss → Wetter ×1,5, kleines Budget → Budget ×1,35).

**3. Couple** – *nicht einfach addiert*:

| Anteil | Komponente |
|---|---|
| 35 % | **Gemeinsame Präferenzen:** elementweises Minimum beider Gewichtsvektoren – zählt nur, was *beiden* wichtig ist |
| 25 % | **Zufriedenheit beider:** 55 % die *weniger* zufriedene Person + 45 % Durchschnitt |
| 15 % | **Budget** (Schnittmenge beider Budgetrahmen, Flexibilität berücksichtigt) & Preis-Leistung |
| 10 % | **August-Wetter** |
| 10 % | **Erreichbarkeit** (strengere Transfertoleranz zählt) |
| 5 % | **Allgemeine Eignung** |

Dynamisch angepasst an die Antworten, danach Abzüge: Muss-Kriterien **beider** (stark), Ausschlusswünsche **beider**,
und ein **Fairness-Abzug**, wenn ein Ziel nur für eine Person großartig ist (Differenz > 10 Punkte).
Der angezeigte *Couple Match* ist der Score selbst (ohne kosmetisches Aufblähen, max. 99 %).

**Wildcard:** bestes Ziel ab Rang 4, das kein „Klassiker“ ist, nicht im Land der Top 3 liegt und nicht aus einer explizit gewählten
Moodboard-Welt stammt (bzw. auf anderem Kontinent liegt).

**Kompatibilität (6 Werte):** Ähnlichkeit der Gewichtsvektoren je Bereich + Slider-Abstände + übereinstimmende Entscheidungen; Budget über Überlappung der Budgetrahmen.

Gewichtungen/Bedeutungen anpassen: Mapping-Tabellen in `engine/profile.ts`, Gewichte in `engine/score.ts`.

---

## 8. Live-Recherche

Bei jeder Top-Destination gibt es „Live abfragen“ (nur mit gültigem privatem Link oder als Admin). Strikt getrennt:
**(1) Bewertung** und **(2) geschätztes Budget** kommen aus der Datenbank, **(3) Live-Daten** ausschließlich aus echten API-Antworten mit Zeitstempel.

| Bereich | Status | Anbieter |
|---|---|---|
| Klimadaten August (5-Jahres-Mittel) | ✅ eingebaut, ohne Key | Open-Meteo Historical API |
| Reise- & Sicherheitshinweise | ✅ eingebaut, ohne Key | Auswärtiges Amt OpenData |
| Flugpreise/-zeiten ab BER | ⏳ „Noch nicht verfügbar“ | z. B. Duffel, Amadeus-Nachfolger, Kiwi Tequila – Vertrag/API-Key nötig |
| Hotels mit Pool & Preise | ⏳ „Noch nicht verfügbar“ | z. B. Booking.com Demand API, Expedia Rapid – Partnerzugang nötig |
| Transfers | ⏳ „Noch nicht verfügbar“ | z. B. Mozio, Hoppa – Partnerzugang nötig |

Neue Anbieter in `src/lib/server/live.ts` ergänzen (Funktion `notConnected` durch echten Abruf ersetzen); Keys nur als Vercel-Umgebungsvariablen.
Ohne Anbieter zeigt die App bewusst „Noch nicht verfügbar“ – nichts wird erfunden.

---

## 9. Tests

| Befehl | Inhalt |
|---|---|
| `npm test` | 25 Unit-Tests: Datenbank-Integrität, August-Wetter, alle 12 geforderten Szenarien, Verschlüsselung, Token, Sperren, Zugriffstrennung, Reset |
| `npm run test:scenarios` | nur die Szenario-Tests, ausführlich |
| `npm run test:e2e` | 22 Prüfungen im emulierten iPhone 14 gegen einen laufenden Server (`npm run build && npm start`, `BASE_URL`, `ADMIN_PASSWORD`; `SHOTS=1` speichert Screenshots) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |

Abgedeckte Szenarien: (1) nur Joanna fertig · (2) nur Kewin fertig · (3) beide fertig · (4) fast identisch · (5) stark unterschiedlich ·
(6) Europa vs. Fernreise · (7) Luxus vs. kleines Budget · (8) beide ruhige Strände · (9) beide lebendiger Küstenort ·
(10) Top-Strand, schlechtes Augustwetter · (11) perfekt, aber sehr lange Anreise · (12) über Budget.

---

## 10. Eure Fotos

Dateien nach `public/couple/` legen: `joanna-kewin-1.jpg` (Hochformat, Hauptbild) und `joanna-kewin-2.jpg`.
Die Originale werden **nicht verändert** – nur per CSS zugeschnitten (Fokuspunkt über `objectPosition` in `src/app/page.tsx`).
Ohne Fotos zeigt die Startseite Reise-Stimmungsbilder – niemals künstliche Ersatzpersonen.

Alle Destinationsbilder sind geprüfte **Stimmungsbilder** von Unsplash (Unsplash-Lizenz) und werden in der App als solche gekennzeichnet;
eigene Bilder pro Ziel lassen sich in `src/lib/destinations/images.ts` hinterlegen.
