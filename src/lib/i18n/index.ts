import { de } from "./de";

/**
 * Lightweight i18n. The English text is the key; `de.ts` maps it to German.
 * Missing translations fall back to English. Variables: t("Hello, {name}", { name }).
 * Safe to import on client and server.
 */
export type Locale = "en" | "de";
export const LOCALES: Locale[] = ["en", "de"];
export const LOCALE_COOKIE = "one_lang";
export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "de";
}

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Dynamic messages (with numbers etc.) that are produced in English deep inside services. */
const PATTERNS: [RegExp, string][] = [
  [/^You've used all (\d[\d,.]*) AI requests for this month\.$/, "Du hast alle $1 KI-Anfragen für diesen Monat verbraucht."],
  [/^Files on (\w+) can be up to (\d+) MB\.$/, "Dateien im Tarif $1 dürfen bis zu $2 MB groß sein."],
  [/^Your (\d[\d,.]*) MB storage is full\.$/, "Dein Speicher von $1 MB ist voll."],
  [/^You've reached ([\d,.]+) saved memories\.$/, "Du hast $1 gespeicherte Einträge erreicht."],
  [/^(\w+) includes (\d+) open actions at a time\.$/, "$1 enthält $2 offene Vorgänge gleichzeitig."],
  [/^This feature is part of ONE (\w+)\.$/, "Diese Funktion ist Teil von ONE $1."],
  [/^(\d+) (item|items) added to Life\.$/, "$1 Einträge zu Life hinzugefügt."],
  [/^Support access granted for (\d+) hours\.$/, "Support-Zugriff für $1 Stunden erteilt."],
  [/^The AI service returned an error \((.+)\)\. Please try again\.$/, "Der KI-Dienst hat einen Fehler gemeldet ($1). Bitte versuche es erneut."],
  [/^(\d+) (item|items) added to Tasks\.$/, "$1 Aufgaben hinzugefügt."],
  // ONE Business activity history (stored in English, translated when shown)
  [/^Project “(.+)” was created$/, "Projekt „$1“ wurde angelegt"],
  [/^Project “(.+)” was updated$/, "Projekt „$1“ wurde aktualisiert"],
  [/^Project “(.+)” was archived$/, "Projekt „$1“ wurde archiviert"],
  [/^Project “(.+)” was restored$/, "Projekt „$1“ wurde wiederhergestellt"],
  [/^Project “(.+)” moved to (\w+)$/, "Projekt „$1“ hat jetzt den Status $2"],
  [/^Task “(.+)” was created and assigned$/, "Aufgabe „$1“ wurde angelegt und zugewiesen"],
  [/^Task “(.+)” was created$/, "Aufgabe „$1“ wurde angelegt"],
  [/^Task “(.+)” was updated$/, "Aufgabe „$1“ wurde aktualisiert"],
  [/^Task “(.+)” was completed$/, "Aufgabe „$1“ wurde erledigt"],
  [/^Task “(.+)” was reopened$/, "Aufgabe „$1“ wurde wieder geöffnet"],
  [/^Task “(.+)” was deleted$/, "Aufgabe „$1“ wurde gelöscht"],
  [/^(\d+) tasks were created from “(.+)”$/, "$1 Aufgaben wurden aus „$2“ erstellt"],
  [/^Action “(.+)” was started$/, "Vorgang „$1“ wurde gestartet"],
  [/^Action “(.+)” is now: New$/, "Vorgang „$1“ hat jetzt den Status: Neu"],
  [/^Action “(.+)” is now: In progress$/, "Vorgang „$1“ hat jetzt den Status: In Bearbeitung"],
  [/^Action “(.+)” is now: Waiting for you$/, "Vorgang „$1“ hat jetzt den Status: Wartet auf dich"],
  [/^Action “(.+)” is now: Waiting for a reply$/, "Vorgang „$1“ hat jetzt den Status: Wartet auf externe Rückmeldung"],
  [/^Action “(.+)” is now: Done$/, "Vorgang „$1“ hat jetzt den Status: Erledigt"],
  [/^Action “(.+)” is now:? (.+)$/, "Vorgang „$1“ hat jetzt den Status: $2"],
  [/^Document “(.+)” was uploaded$/, "Dokument „$1“ wurde hochgeladen"],
  [/^“(.+)” was added to the knowledge base$/, "„$1“ wurde dem Firmenwissen hinzugefügt"],
  [/^“(.+)” was removed from the knowledge base$/, "„$1“ wurde aus dem Firmenwissen entfernt"],
  [/^Client “(.+)” was added$/, "Kunde „$1“ wurde angelegt"],
  [/^Client “(.+)” was removed$/, "Kunde „$1“ wurde entfernt"],
  [/^(.+) was invited as (\w+)$/, "$1 wurde als $2 eingeladen"],
  [/^(.+) joined as (\w+)$/, "$1 ist als $2 beigetreten"],
  [/^A member's role changed from (\w+) to (\w+)$/, "Die Rolle eines Mitglieds wurde von $1 zu $2 geändert"],
  [/^A member was removed from the company$/, "Ein Mitglied wurde aus dem Unternehmen entfernt"],
  [/^Company profile was updated$/, "Das Firmenprofil wurde aktualisiert"],
  [/^(.+) was created$/, "$1 wurde erstellt"],
];

export function translate(locale: Locale, text: string, vars?: Vars): string {
  if (locale === "en") return interpolate(text, vars);
  const hit = de[text];
  if (hit !== undefined) return interpolate(hit, vars);
  for (const [re, rep] of PATTERNS) if (re.test(text)) return text.replace(re, rep);
  return interpolate(text, vars);
}

export function makeT(locale: Locale): T {
  return (text, vars) => translate(locale, text, vars);
}

/** BCP-47 tag for Intl formatting. */
export function intlLocale(locale: Locale) {
  return locale === "de" ? "de-DE" : "en-GB";
}
