import de from '../locales/de.json';
import en from '../locales/en.json';
import { type Lang } from './routes';

export * from './routes';

export type Dict = typeof de;
const dicts: Record<Lang, Dict> = { de, en: en as Dict };

/** Sprache aus der URL: alles unter /en ist Englisch, sonst Deutsch */
export const getLang = (url: URL): Lang =>
  url.pathname === '/en' || url.pathname.startsWith('/en/') ? 'en' : 'de';

export const useT = (lang: Lang): Dict => dicts[lang];

/** Platzhalter wie {amount} ersetzen */
export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** DE „1.490 €“, EN „€1,490“ */
export const eur = (n: number, lang: Lang) =>
  lang === 'en' ? '€' + n.toLocaleString('en-GB') : n.toLocaleString('de-DE') + ' €';
