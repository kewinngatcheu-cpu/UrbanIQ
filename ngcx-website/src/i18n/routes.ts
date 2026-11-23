/**
 * Seiten- und Sektions-Zuordnung zwischen Deutsch und Englisch.
 * Wird auch im Browser genutzt (Sprachwechsel bleibt auf derselben Seite/Sektion),
 * deshalb hier keine Texte importieren.
 */
export type Lang = 'de' | 'en';
export const LANGS: Lang[] = ['de', 'en'];
export const DEFAULT_LANG: Lang = 'de';
export const STORAGE_KEY = 'ngcx-lang';

export type PageKey = 'home' | 'pricing' | 'check' | 'imprint' | 'privacy' | 'terms' | 'notFound';

/** URL je Seite und Sprache. Fehlt eine Sprache, gibt es die Seite nur auf Deutsch. */
export const pages: Record<PageKey, Partial<Record<Lang, string>>> = {
  home: { de: '/', en: '/en' },
  pricing: { de: '/preise', en: '/en/pricing' },
  check: { de: '/pipeline-check', en: '/en/pipeline-check' },
  imprint: { de: '/impressum' },
  privacy: { de: '/datenschutz' },
  terms: { de: '/agb' },
  notFound: {},
};

/** Anker-IDs der Sektionen je Sprache */
export const sections = {
  de: {
    problem: 'problem', calculator: 'rechner', services: 'leistung', method: 'methode', process: 'ablauf',
    why: 'warum', check: 'check', about: 'ueber', faq: 'faq', contact: 'kontakt', setup: 'setup',
  },
  en: {
    problem: 'challenge', calculator: 'calculator', services: 'services', method: 'method', process: 'process',
    why: 'why-ngcx', check: 'check', about: 'about', faq: 'faq', contact: 'contact', setup: 'setup',
  },
} as const;
export type SectionKey = keyof (typeof sections)['de'];

export const pageUrl = (page: PageKey, lang: Lang): string => pages[page][lang] ?? pages.home[lang]!;

export const sectionUrl = (lang: Lang, key: SectionKey, page: PageKey = 'home'): string => {
  const base = pageUrl(page, lang);
  return `${base}#${sections[lang][key]}`;
};

/** Anker-ID von einer Sprache in die andere übersetzen */
export const mapSection = (id: string, from: Lang, to: Lang): string | null => {
  const entry = (Object.keys(sections[from]) as SectionKey[]).find((k) => sections[from][k] === id);
  return entry ? sections[to][entry] : null;
};
