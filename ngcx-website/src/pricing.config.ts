/**
 * NGCX Preise – alle Tarife, Preise und das Founding-Partner-Programm an EINER Stelle.
 *
 * Founding-Programm abschalten: foundingActive = false ODER foundingSpotsLeft = 0.
 * Dann verschwinden automatisch Umschalter, Banner, Badge, Streichpreise und Benefits,
 * und es werden nur die regulären Preise beider Tarife gezeigt.
 *
 * Preise sind Zahlen in Euro (netto). Die Formatierung („1.490 €“) passiert automatisch.
 */

export interface Tier {
  id: string;
  name: string;
  description: string;
  regular: { month: number; setup: number };
  /** Founding-Partner-Preis. null = kein Founding-Rabatt für diesen Tarif. */
  founding: { month: number; setup: number } | null;
  features: string[];
  /** Erster Punkt hervorgehoben (z. B. „Alles aus Pipeline Core“) */
  firstFeatureIsInclude?: boolean;
  cta: { regular: string; founding?: string };
  /** Optisch hervorgehobener Tarif (Primär-Button) */
  highlight?: boolean;
}

export const pricing = {
  foundingActive: true,
  foundingSpotsLeft: 5,
  foundingSpotsTotal: 5,

  eyebrow: 'Preise & Konditionen',
  title: 'Planbare Neukunden. <em>Transparente Preise.</em>',
  lead: 'Ein Setup, das Ihr Akquise-System aufbaut, und eine monatliche Betreuung, die es am Laufen hält. Keine versteckten Kosten, keine Blackbox.',

  toggle: { regular: 'Regulär', founding: 'Founding Partner' },

  foundingBanner: {
    title: 'NGCX Founding Partner Program',
    text: 'Die ersten fünf Partner erhalten dauerhaft bessere Konditionen und gestalten das System mit.',
    badge: 'Founding Partner',
  },

  tiers: [
    {
      id: 'core',
      name: 'Pipeline Core',
      description:
        'Das komplette NGCX-System für ein Zielsegment. Ideal für den Einstieg in planbare Neukundengewinnung.',
      regular: { month: 990, setup: 790 },
      founding: { month: 690, setup: 390 },
      features: [
        'Profitabilitäts-ICP aus Ihren besten Bestandskunden',
        'Marktsignale beobachten: Firmen mit aktuellem Anlass',
        'Anlassbezogene Ansprache, Follow-ups und Qualifizierung',
        'Koordination der Erstgespräche in Ihrem Kalender',
        'Monatlicher Steuerungs-Call mit Pipeline- und Kapazitätsabgleich',
        'Voller Einblick in Listen, Nachrichten und Pipeline',
      ],
      cta: { regular: 'Gespräch vereinbaren', founding: 'Founding-Platz sichern' },
      highlight: true,
    },
    {
      id: 'growth',
      name: 'Pipeline Growth',
      description:
        'Für Beratungen, die mehrere Segmente gleichzeitig erschließen und enger begleitet werden wollen.',
      regular: { month: 1490, setup: 990 },
      founding: null,
      features: [
        'Alles aus Pipeline Core',
        'Bis zu zwei Zielsegmente parallel',
        'Höheres Recherche- und Ansprachevolumen',
        'Wöchentlicher Abstimmungs-Call statt Kurz-Update',
        'Quartals-Strategie mit der Geschäftsführung',
        'Priorisierter Zugang zu neuen NGCX-Leistungen',
      ],
      firstFeatureIsInclude: true,
      cta: { regular: 'Gespräch vereinbaren' },
    },
  ] as Tier[],

  setup: {
    eyebrow: 'Was im Setup steckt',
    title: 'In 2–3 Wochen zu Ihrem eigenen Akquise-System',
    steps: [
      { title: 'Onboarding-Interview', text: '60–90 Minuten mit der Geschäftsführung zu Angebot, Projekten und Wunschkunden.' },
      { title: 'Profitabilitäts-ICP', text: 'Wir finden heraus, mit welchen Kunden Sie wirklich Geld verdienen.' },
      { title: '50–100 Zielaccounts', text: 'Recherchiert mit Entscheider und konkretem Anlass für die Ansprache.' },
      { title: 'Ansprache & Pipeline', text: 'Kernbotschaften, Vorlagen und eine eingerichtete Pipeline. Alles gehört Ihnen.' },
    ],
  },

  benefits: {
    title: 'Founding Partner Benefits',
    items: [
      '400 € Ersparnis beim Setup',
      '300 € weniger pro Monat, 12 Monate garantiert',
      'Direkter Draht zum Gründer',
      'Neue Leistungen aus Operations und Intelligence als Erste testen',
      'Das System aktiv mitgestalten',
    ],
    note: 'Im Gegenzug: eine Referenz bei Erfolg und anonymisiertes Feedback.',
  },

  conditions: {
    title: 'Konditionen',
    items: [
      '3 Monate Mindestlaufzeit, danach monatlich kündbar',
      'Feste Liefermengen mit klarer Nachbesserungsregel',
      'Alle Ergebnisse aus dem Setup gehören Ihnen',
      'Wir bringen qualifizierte Gespräche, Sie führen den Abschluss. Keine Umsatzgarantie.',
      'Alle Preise zzgl. MwSt.',
    ],
  },

  closing: {
    title: 'Unsicher, welcher Tarif passt?',
    text: 'Machen Sie den Pipeline-Check in 3 Minuten oder sprechen Sie 15 Minuten mit uns.',
  },
};

/** true, wenn das Founding-Programm sichtbar sein soll */
export const foundingOn = pricing.foundingActive && pricing.foundingSpotsLeft > 0;

export const eur = (n: number) => n.toLocaleString('de-DE') + ' €';

/** Günstigster aktuell gültiger Monatspreis (für Teaser auf der Startseite) */
export const fromPrice = (t: Tier) => (foundingOn && t.founding ? t.founding.month : t.regular.month);
