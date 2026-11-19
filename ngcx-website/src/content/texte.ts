/**
 * Alle Texte der Startseite an einem Ort.
 * t('ihr-Variante', 'Sie-Variante') – welche angezeigt wird, steuert ANSPRACHE in src/config.ts.
 * <em>…</em> in Überschriften wird in hellem Blau hervorgehoben.
 */
import { t } from '../lib/ansprache';

export const meta = {
  home: {
    title: 'NGCX – Planbare Neukundengewinnung für IT-Beratungen',
    description: t(
      'NGCX ist der Growth Partner für IT-Beratungen und Softwareagenturen im DACH-Raum. Wir bauen euch ein Vertriebssystem, das planbar Gespräche mit den richtigen Entscheidern bringt.',
      'NGCX ist der Growth Partner für IT-Beratungen und Softwareagenturen im DACH-Raum. Wir bauen Ihnen ein Vertriebssystem, das planbar Gespräche mit den richtigen Entscheidern bringt.',
    ),
  },
  check: {
    title: 'NGCX Pipeline-Check – Wie planbar ist euer Neukundengeschäft?',
    description:
      'Kostenloser Selbsttest für IT-Beratungen: 12 Fragen, 3 Minuten, sofortige Auswertung. Läuft komplett im Browser, keine Daten werden gespeichert.',
  },
};

export const announcement = {
  text: t(
    '<strong>Neu:</strong> Der NGCX Pipeline-Check – wie planbar ist euer Neukundengeschäft? In 3 Minuten',
    '<strong>Neu:</strong> Der NGCX Pipeline-Check – wie planbar ist Ihr Neukundengeschäft? In 3 Minuten',
  ),
};

export const hero = {
  eyebrow: 'Growth Partner für IT-Beratungen & Softwareagenturen',
  // Alternativen: „Planbare Neukunden statt Warten auf Empfehlungen.“
  //               „Euer Wachstum sollte nicht davon abhängen, wer gerade Zeit hat.“
  title: 'Neukunden, die <em>nicht vom Zufall</em> abhängen.',
  lead: t(
    'Die meisten IT-Beratungen wachsen über Empfehlungen, bis diese ausbleiben. NGCX baut euch ein Vertriebssystem, das planbar neue Gespräche mit den richtigen Entscheidern bringt.',
    'Die meisten IT-Beratungen wachsen über Empfehlungen, bis diese ausbleiben. NGCX baut Ihnen ein Vertriebssystem, das planbar neue Gespräche mit den richtigen Entscheidern bringt.',
  ),
  primary: 'Pipeline-Check starten',
  secondary: '15-Min-Gespräch vereinbaren',
  note: 'Kostenlos · 12 Fragen · 3 Minuten',
  chips: ['DACH', '10–50 Mitarbeitende', 'Proof-First'],
};

export const problem = {
  eyebrow: 'Die Ausgangslage',
  title: t('Kommt euch das <em>bekannt</em> vor?', 'Kommt Ihnen das <em>bekannt</em> vor?'),
  cards: [
    {
      title: 'Empfehlungen als einziger Kanal',
      text: t(
        'Neue Projekte kommen fast nur über Empfehlungen und bestehende Kontakte. Das funktioniert, solange das Netzwerk liefert. Wann es das tut, entscheidet ihr nicht selbst.',
        'Neue Projekte kommen fast nur über Empfehlungen und bestehende Kontakte. Das funktioniert, solange das Netzwerk liefert. Wann es das tut, entscheiden Sie nicht selbst.',
      ),
    },
    {
      title: 'Akquise läuft nebenbei',
      text: 'Die Geschäftsführung macht den Vertrieb selbst, wenn Zeit ist. Sobald ein Projekt brennt, steht die Neukundengewinnung still.',
    },
    {
      title: 'Projektende heißt Unruhe',
      text: 'Ein großes Projekt läuft aus und der Anschluss ist nicht in Sicht. Dann wird das Netzwerk abtelefoniert, unter Zeitdruck.',
    },
  ],
  consequence:
    'Die Folgen: <strong>Berater ohne Projekt</strong>, <strong>Umsatz, der nicht zurückkommt</strong>, und <strong>Wachstumspläne, die warten müssen</strong>.',
  bridge: t(
    'Wo steht ihr gerade? Findet es in 3 Minuten heraus.',
    'Wo stehen Sie gerade? Finden Sie es in 3 Minuten heraus.',
  ),
  bridgeLink: 'Zum Pipeline-Check',
};

export const rechner = {
  eyebrow: 'Rechenbeispiel',
  title: t('Was kostet euch <em>freie Kapazität</em>?', 'Was kostet Sie <em>freie Kapazität</em>?'),
  lead: t(
    'Jeder Beratertag ohne Projekt ist Umsatz, der nicht zurückkommt. Stellt eure Werte ungefähr ein.',
    'Jeder Beratertag ohne Projekt ist Umsatz, der nicht zurückkommt. Stellen Sie Ihre Werte ungefähr ein.',
  ),
  note: 'Rechnung: Berater × (Ziel- minus Ist-Auslastung) × 20 Arbeitstage × Tagessatz. Ein Richtwert, keine Prognose.',
  link: 'Vollständige Auswertung im Pipeline-Check',
};

export const leistung = {
  eyebrow: 'Leistung',
  title: 'Das NGCX <em>Pipeline System</em>',
  lead: t(
    'NGCX Sales ist Neukundengewinnung als betreute Dienstleistung. Wir übernehmen die Arbeit, die im Tagesgeschäft liegen bleibt, vom Zielkundenprofil bis zum vereinbarten Erstgespräch. Ihr konzentriert euch auf eure Projekte und auf die Gespräche selbst.',
    'NGCX Sales ist Neukundengewinnung als betreute Dienstleistung. Wir übernehmen die Arbeit, die im Tagesgeschäft liegen bleibt, vom Zielkundenprofil bis zum vereinbarten Erstgespräch. Sie konzentrieren sich auf Ihre Projekte und auf die Gespräche selbst.',
  ),
  items: [
    {
      icon: 'target',
      title: 'Ideal Customer Profile schärfen',
      text: t(
        'Gemeinsam legen wir fest, welche Unternehmen und Rollen wirklich zu euch passen und woran man Bedarf erkennt.',
        'Gemeinsam legen wir fest, welche Unternehmen und Rollen wirklich zu Ihnen passen und woran man Bedarf erkennt.',
      ),
    },
    {
      icon: 'search',
      title: 'Recherche von Zielunternehmen und Entscheidern',
      text: 'Wir finden die Unternehmen, die ins Profil passen, und die Menschen, die dort entscheiden.',
    },
    {
      icon: 'route',
      title: 'Vertriebsstrategie',
      text: t(
        'Kanäle, Reihenfolge, Schwerpunkte: ein klarer Plan, wie ihr eure Wunschkunden erreicht.',
        'Kanäle, Reihenfolge, Schwerpunkte: ein klarer Plan, wie Sie Ihre Wunschkunden erreichen.',
      ),
    },
    {
      icon: 'list',
      title: 'Leadlisten',
      text: 'Gepflegte Listen mit Unternehmen, Ansprechpartnern und Kontext statt bloßer Firmennamen.',
    },
    {
      icon: 'message',
      title: 'Kommunikationskonzepte und Ansprachen',
      text: t(
        'Botschaften, die auf Rolle und Situation des Empfängers zugeschnitten sind und zu eurer Positionierung passen.',
        'Botschaften, die auf Rolle und Situation des Empfängers zugeschnitten sind und zu Ihrer Positionierung passen.',
      ),
    },
    {
      icon: 'columns',
      title: 'CRM- und Pipeline-Management',
      text: 'Jede Verkaufschance an einem Ort, mit klaren Phasen und nächsten Schritten.',
    },
    {
      icon: 'filter',
      title: 'Qualifizierung von Kontakten',
      text: t(
        'Wir klären vorab, ob Bedarf, Zeitpunkt und Rolle passen. So sprecht ihr mit den Richtigen.',
        'Wir klären vorab, ob Bedarf, Zeitpunkt und Rolle passen. So sprechen Sie mit den Richtigen.',
      ),
    },
    {
      icon: 'calendar',
      title: 'Koordination von Erstgesprächen',
      text: t(
        'Termine werden abgestimmt und vorbereitet. Ihr geht informiert ins Gespräch.',
        'Termine werden abgestimmt und vorbereitet. Sie gehen informiert ins Gespräch.',
      ),
    },
    {
      icon: 'chart',
      title: 'Reporting',
      text: t(
        'Ihr seht regelmäßig, was passiert ist, was funktioniert und wo es hakt.',
        'Sie sehen regelmäßig, was passiert ist, was funktioniert und wo es hakt.',
      ),
    },
  ],
};

export const methode = {
  eyebrow: 'Methode',
  title: 'Das NGCX <em>Industry Growth System</em>',
  lead: 'Vier Bausteine, die aufeinander aufbauen. Zusammen machen sie aus Zufall einen Prozess.',
  steps: [
    {
      title: 'Industry Intelligence',
      text: 'Markt, Auslöser und Entscheider verstehen. Welche Ereignisse lösen Bedarf aus, und wer entscheidet darüber?',
    },
    {
      title: 'Precision Acquisition',
      text: 'Die richtigen Unternehmen zur richtigen Zeit gezielt ansprechen. Persönlich, nicht in der Masse.',
    },
    {
      title: 'Brand Distribution',
      text: t(
        'Eure Botschaft konsequent vor die richtigen Entscheider bringen, damit man euch kennt, bevor der Bedarf da ist.',
        'Ihre Botschaft konsequent vor die richtigen Entscheider bringen, damit man Sie kennt, bevor der Bedarf da ist.',
      ),
    },
    {
      title: 'Pipeline Intelligence',
      text: 'Pipeline messen, steuern und Engpässe früh erkennen. Entscheidungen auf Basis von Zahlen statt aus dem Bauch.',
    },
  ],
};

export const ablauf = {
  eyebrow: 'Einstieg & Zusammenarbeit',
  title: 'Klein anfangen. <em>Belegen.</em> Dann ausbauen.',
  lead: 'Wir starten nicht mit einem langen Vertrag, sondern mit einem klar umrissenen Pilot. Erst wenn die Ergebnisse stimmen, geht es weiter.',
  offers: [
    {
      tag: 'Einstieg',
      title: 'NGCX Pipeline Sprint',
      text: 'Der Pilot, um NGCX unter realen Bedingungen kennenzulernen.',
      points: [
        'Klar definierter Umfang und Zeitraum',
        'Erfolgskriterien werden vorab gemeinsam festgelegt',
        'Messbare Zwischenergebnisse statt Bauchgefühl',
        'Am Ende eine ehrliche Bewertung, ob und wie es weitergeht',
      ],
      priceKey: 'sprint' as const,
    },
    {
      tag: 'Laufend',
      title: 'NGCX Pipeline Management',
      text: t(
        'Die laufende, monatliche Betreuung eures Neukundengeschäfts.',
        'Die laufende, monatliche Betreuung Ihres Neukundengeschäfts.',
      ),
      points: [
        'Kontinuierliche Recherche, Ansprache und Qualifizierung',
        'Gepflegte Pipeline mit klaren Phasen',
        'Koordination von Erstgesprächen',
        'Monatliches Reporting mit nachvollziehbaren Kennzahlen',
      ],
      priceKey: 'management' as const,
    },
  ],
  stepsTitle: 'So beginnt die Zusammenarbeit',
  steps: [
    {
      title: 'Kostenloses 15-Min-Gespräch',
      text: t(
        'Wir hören zu, wie ihr heute Neukunden gewinnt, und sagen ehrlich, ob NGCX passt.',
        'Wir hören zu, wie Sie heute Neukunden gewinnen, und sagen ehrlich, ob NGCX passt.',
      ),
    },
    {
      title: 'Pipeline Sprint',
      text: 'Der Pilot mit klarem Umfang und vorab vereinbarten Kriterien.',
    },
    {
      title: 'Laufende Partnerschaft',
      text: 'Wenn die Ergebnisse überzeugen: monatliche Betreuung mit festem Reporting.',
    },
  ],
};

export const warum = {
  eyebrow: 'Warum NGCX',
  title: 'Spezialisiert. Ehrlich. <em>Auf Dauer angelegt.</em>',
  points: [
    {
      title: 'Eine Branche, kein Bauchladen',
      text: 'NGCX arbeitet ausschließlich für IT-Beratungen und Softwareagenturen. Wir konzentrieren uns auf die Auslöser, Rollen und die Sprache genau dieser Branche.',
    },
    {
      title: 'Proof-First',
      text: 'Erst zeigen, dass es funktioniert, dann skalieren. Deshalb beginnt jede Zusammenarbeit mit einem Pilot.',
    },
    {
      title: 'Transparenz',
      text: t(
        'Klare Kennzahlen, keine leeren Versprechen. Wir garantieren keine Umsätze, sondern verpflichten uns auf Leistungen, die wir beeinflussen können, und machen sie für euch sichtbar.',
        'Klare Kennzahlen, keine leeren Versprechen. Wir garantieren keine Umsätze, sondern verpflichten uns auf Leistungen, die wir beeinflussen können, und machen sie für Sie sichtbar.',
      ),
    },
    {
      title: 'Langfristige Partnerschaft',
      text: t(
        'Es geht nicht um ein paar schnelle Termine, sondern um ein Vertriebssystem, das wir mit euch aufbauen und das trägt.',
        'Es geht nicht um ein paar schnelle Termine, sondern um ein Vertriebssystem, das wir mit Ihnen aufbauen und das trägt.',
      ),
    },
  ],
  principles: [
    'Problem vor Produkt',
    'Mehrwert vor Technologie',
    'Vertrauen vor Integration',
    'Positionierung vor Reichweite',
    'Proof vor Skalierung',
  ],
};

export const checkBand = {
  eyebrow: 'Kostenloser Pipeline-Check',
  title: t(
    'Wie <em>planbar</em> ist euer Neukundengeschäft?',
    'Wie <em>planbar</em> ist Ihr Neukundengeschäft?',
  ),
  text: t(
    '12 Fragen, 3 Minuten, sofortige Auswertung. Ihr seht, in welchem der vier Bereiche euer größter Hebel liegt.',
    '12 Fragen, 3 Minuten, sofortige Auswertung. Sie sehen, in welchem der vier Bereiche Ihr größter Hebel liegt.',
  ),
  areas: ['Zielkunden-Klarheit', 'Akquise-Motor', 'Ansprache & Botschaft', 'Pipeline & Steuerung'],
  meta: '12 Fragen · 3 Minuten · Sofort-Auswertung',
  privacy: t(
    'Läuft komplett in eurem Browser. Es werden keine Antworten gespeichert oder übertragen.',
    'Läuft komplett in Ihrem Browser. Es werden keine Antworten gespeichert oder übertragen.',
  ),
  button: 'Check starten',
};

export const ueber = {
  eyebrow: 'Über NGCX',
  title: 'Wer hinter <em>NGCX</em> steht',
  paragraphs: [
    'Ich bin Kewin, Gründer von NGCX. <span class="ph">[PLATZHALTER: Zwei bis drei Sätze zu deinem beruflichen Hintergrund und dazu, warum du dich auf IT-Beratungen und Softwareagenturen spezialisiert hast.]</span>',
    'Mit NGCX möchte ich IT-Beratungen und Softwareagenturen etwas geben, das bei vielen fehlt: ein Neukundengeschäft, das nicht vom Zufall abhängt, sondern von einem Prozess, den man messen und verbessern kann.',
  ],
  pilot:
    'NGCX ist im Aufbau. Wir starten bewusst mit einer kleinen Zahl von Pilotpartnern, um gemeinsam zu belegen, was funktioniert. Referenzen zeigen wir, sobald es echte gibt.',
  linkedin: 'Kewin auf LinkedIn',
};

export const faq = {
  eyebrow: 'FAQ',
  title: 'Häufige <em>Fragen</em>',
  items: [
    {
      q: 'Was ist der Pipeline-Check?',
      a: t(
        'Ein kostenloser Selbsttest mit 12 Fragen zu vier Bereichen: Zielkunden-Klarheit, Akquise-Motor, Ansprache & Botschaft sowie Pipeline & Steuerung. Nach etwa 3 Minuten seht ihr, wo eure Pipeline Lücken hat und was euch freie Kapazität ungefähr kostet. Die Auswertung läuft komplett in eurem Browser, es werden keine Antworten gespeichert oder übertragen. <a href="/pipeline-check">Zum Pipeline-Check →</a>',
        'Ein kostenloser Selbsttest mit 12 Fragen zu vier Bereichen: Zielkunden-Klarheit, Akquise-Motor, Ansprache & Botschaft sowie Pipeline & Steuerung. Nach etwa 3 Minuten sehen Sie, wo Ihre Pipeline Lücken hat und was Sie freie Kapazität ungefähr kostet. Die Auswertung läuft komplett in Ihrem Browser, es werden keine Antworten gespeichert oder übertragen. <a href="/pipeline-check">Zum Pipeline-Check →</a>',
      ),
    },
    {
      q: 'Für wen ist NGCX gedacht?',
      a: 'Für IT-Beratungen und Softwareagenturen im DACH-Raum mit etwa 10 bis 50 Mitarbeitenden. Wir sprechen mit Geschäftsführern, Gründern und Managing Directors, die ihr Wachstum nicht länger allein von Empfehlungen abhängig machen wollen.',
    },
    {
      q: 'Was unterscheidet NGCX von einer Leadgen- oder Marketingagentur?',
      a: t(
        'Wir arbeiten nur für eine Branche und verkaufen keine Lead-Pakete. Statt Masse geht es um die gezielte, persönliche Ansprache der richtigen Entscheider, um eine gepflegte Pipeline und um Zahlen, an denen ihr den Fortschritt messen könnt. Und wir beginnen mit einem Pilot, nicht mit einem Jahresvertrag.',
        'Wir arbeiten nur für eine Branche und verkaufen keine Lead-Pakete. Statt Masse geht es um die gezielte, persönliche Ansprache der richtigen Entscheider, um eine gepflegte Pipeline und um Zahlen, an denen Sie den Fortschritt messen können. Und wir beginnen mit einem Pilot, nicht mit einem Jahresvertrag.',
      ),
    },
    {
      q: t('Garantiert ihr Aufträge?', 'Garantiert NGCX Aufträge?'),
      a: 'Nein. Ob aus einem Gespräch ein Auftrag wird, hängt von vielen Faktoren ab, die niemand seriös garantieren kann. Wir verpflichten uns auf messbare Leistungen, die wir beeinflussen können, etwa Recherche, Ansprache und die Koordination von Erstgesprächen, und machen transparent, was dabei herauskommt.',
    },
    {
      q: 'Wie viel Zeit muss unsere Geschäftsführung investieren?',
      a: 'Am Anfang etwas mehr: für das Zielkundenprofil, die Freigabe der Ansprachen und kurzes Feedback zu den ersten Gesprächen. Danach vor allem für die Erstgespräche selbst und einen regelmäßigen, kurzen Abgleich. Den genauen Rahmen legen wir vor dem Start gemeinsam fest.',
    },
    {
      q: t('Welche Daten braucht ihr von uns?', 'Welche Daten braucht NGCX von uns?'),
      a: t(
        'Wenig. Der Einstieg ist bewusst ohne sensible Unternehmenszahlen möglich. Wir brauchen vor allem euer Wissen: wer eure besten Kunden sind, welche Probleme ihr löst und wie ihr arbeitet.',
        'Wenig. Der Einstieg ist bewusst ohne sensible Unternehmenszahlen möglich. Wir brauchen vor allem Ihr Wissen: wer Ihre besten Kunden sind, welche Probleme Sie lösen und wie Sie arbeiten.',
      ),
    },
    {
      q: 'Wie läuft der Pilot ab?',
      a: t(
        'Nach dem Erstgespräch legen wir Umfang, Zeitraum und die Kriterien fest, an denen wir den Pilot messen. Dann schärfen wir das Zielkundenprofil, recherchieren Unternehmen und Entscheider, entwickeln die Ansprache und starten nach eurer Freigabe. Ihr bekommt regelmäßige Zwischenstände und am Ende eine ehrliche Auswertung.',
        'Nach dem Erstgespräch legen wir Umfang, Zeitraum und die Kriterien fest, an denen wir den Pilot messen. Dann schärfen wir das Zielkundenprofil, recherchieren Unternehmen und Entscheider, entwickeln die Ansprache und starten nach Ihrer Freigabe. Sie bekommen regelmäßige Zwischenstände und am Ende eine ehrliche Auswertung.',
      ),
    },
    {
      q: t('Wie sprecht ihr potenzielle Kunden an?', 'Wie spricht NGCX potenzielle Kunden an?'),
      a: t(
        'Zuerst über LinkedIn und persönliche, gezielte Ansprache einzelner Entscheider. Keine Massen-Mails. Jede Ansprache wird vorab mit euch abgestimmt und erfolgt rechtskonform nach UWG und DSGVO.',
        'Zuerst über LinkedIn und persönliche, gezielte Ansprache einzelner Entscheider. Keine Massen-Mails. Jede Ansprache wird vorab mit Ihnen abgestimmt und erfolgt rechtskonform nach UWG und DSGVO.',
      ),
    },
  ],
};

export const kontakt = {
  eyebrow: 'Kontakt',
  title: t(
    'Lasst uns 15 Minuten über eure <em>Pipeline</em> sprechen.',
    'Lassen Sie uns 15 Minuten über Ihre <em>Pipeline</em> sprechen.',
  ),
  text: t(
    'Kein Pitch, keine Verkaufsshow. Ihr erzählt, wie ihr heute Neukunden gewinnt, und bekommt eine ehrliche Einschätzung, ob und wo NGCX helfen kann.',
    'Kein Pitch, keine Verkaufsshow. Sie erzählen, wie Sie heute Neukunden gewinnen, und bekommen eine ehrliche Einschätzung, ob und wo NGCX helfen kann.',
  ),
  button: '15-Min-Gespräch vereinbaren',
  mailLabel: 'Lieber per E-Mail?',
};

export const footer = {
  description:
    'Growth Partner für IT-Beratungen und Softwareagenturen im DACH-Raum. Planbare Neukundengewinnung als betreute Dienstleistung.',
};

export const nav = [
  { href: '/#leistung', label: 'Leistung' },
  { href: '/#methode', label: 'Methode' },
  { href: '/#ablauf', label: 'Ablauf' },
  { href: '/pipeline-check', label: 'Pipeline-Check', badge: 'kostenlos' },
  { href: '/#ueber', label: 'Über NGCX' },
  { href: '/#faq', label: 'FAQ' },
];
