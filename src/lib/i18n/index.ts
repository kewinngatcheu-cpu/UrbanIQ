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
