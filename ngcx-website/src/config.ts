/**
 * Zentrale Konfiguration der NGCX-Website.
 * Alles, was du später selbst ändern willst, steht hier.
 * Werte in [ECKIGEN KLAMMERN] sind Platzhalter (siehe PLATZHALTER.md).
 */

/** Basis-URL für Canonical-Links, Sitemap und Open Graph. */
export const SITE_URL = 'https://ngcxintelligence.de';

/**
 * Buchungslink für das 15-Min-Gespräch (Calendly, Cal.com, Google-Terminbuchung …).
 * Solange hier "#" steht, führen alle Buchungs-Buttons zum Kontaktbereich der Startseite.
 * [BUCHUNGSLINK]
 */
export const BOOKING_URL: string = 'https://calendly.com/kewin-ngcxintelligence/30min';

/** Geschäftliche E-Mail-Adresse. [E-MAIL] */
export const CONTACT_EMAIL = 'kewin@ngcxintelligence.de';

/** LinkedIn-Profil von Kewin. Solange "#", ist der Link ohne Ziel. [LINKEDIN_URL] */
export const LINKEDIN_URL: string = 'https://www.linkedin.com/in/kewin-ngatcheu-455358284';

/** Preise, Tarife und Founding-Partner-Programm: siehe src/pricing.config.ts */

/**
 * Ansprache auf der gesamten Website: 'ihr' oder 'sie'.
 * Alle Texte stehen in src/content/texte.ts in beiden Varianten.
 * Hinweis: Der Pipeline-Check (src/pages/pipeline-check.astro) ist fest auf "Sie" formuliert.
 */
export const ANSPRACHE: 'ihr' | 'sie' = 'sie';

/** Schmale Hinweisleiste ganz oben ein-/ausblenden. */
export const SHOW_ANNOUNCEMENT: boolean = true;

/** Gründer. Foto: Pfad unter /public, z. B. '/img/kewin.webp'. null = Platzhalter mit Initiale. */
export const FOUNDER = {
  name: 'Kewin',
  role: 'Gründer von NGCX',
  photo: null as string | null,
};

/** Hilfsfunktionen */
export const isPlaceholder = (v: string) => v === '#' || v.includes('[');
export const bookingLink = () =>
  isPlaceholder(BOOKING_URL)
    ? { href: '/#kontakt', external: false }
    : { href: BOOKING_URL, external: true };
