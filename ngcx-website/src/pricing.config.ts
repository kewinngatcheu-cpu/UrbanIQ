/**
 * NGCX Preise – zentrale Konfiguration (nur Zahlen und Schalter).
 * Alle Texte zu Tarifen und Programm stehen in src/locales/de.json und en.json unter "pricing".
 *
 * Founding-Programm aus: foundingActive = false ODER foundingSpotsLeft = 0.
 * Dann verschwinden Umschalter, Banner, Badges, Streichpreise und Benefits in beiden Sprachen.
 */
export const pricing = {
  foundingActive: true,
  foundingSpotsTotal: 5,
  foundingSpotsLeft: 5, // gilt für beide Tarife zusammen
  /** Ab dieser Zahl freier Plätze (und darunter) erscheinen Balken + „Nur noch X …“; darüber nur „Begrenzt auf 5 Partner“ */
  showSpotsCounterFrom: 3,

  core: {
    regular: { setup: 790, monthly: 990 },
    founding: { setup: 390, monthly: 690 },
  },
  growth: {
    regular: { setup: 990, monthly: 1490 },
    founding: { setup: 490, monthly: 1090 },
  },
};

export type TierKey = 'core' | 'growth';
export const tierOrder: TierKey[] = ['core', 'growth'];
/** Optisch leicht hervorgehobener Tarif */
export const highlightTier: TierKey = 'growth';

export const foundingOn = pricing.foundingActive && pricing.foundingSpotsLeft > 0;

/** Platzanzeige mit Balken erst, wenn nur noch wenige Plätze frei sind */
export const showSpotsCounter = foundingOn && pricing.foundingSpotsLeft <= pricing.showSpotsCounterFrom;

/** Größte Ersparnis über alle Tarife (für „Bis zu … Ersparnis“) */
export const maxSaving = {
  setup: Math.max(...tierOrder.map((t) => pricing[t].regular.setup - pricing[t].founding.setup)),
  monthly: Math.max(...tierOrder.map((t) => pricing[t].regular.monthly - pricing[t].founding.monthly)),
};
