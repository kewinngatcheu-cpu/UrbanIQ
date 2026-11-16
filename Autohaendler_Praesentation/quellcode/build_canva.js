// Canva-freundliche Version: einfache Folien, nur Textfelder, Formen und Bilder (keine Layout-Platzhalter, keine Animationen)
const pptxgen = require("pptxgenjs");
const path = require("path");
const N = require("./notes_canva.json");
const IMG = path.join(__dirname, "..", "img");
const OUT = process.argv[2] || "canva.pptx";

const BG = "151719", BLACK = "090A0B", WHITE = "FFFFFF", RED = "E63935", GREY = "BFC3C7", BOX = "24272A";
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "Der Beruf Autohändler";
const W = 13.333, H = 7.5, M = 0.6;

const note = (s, i) => s.addNotes(`Zeit: ${N[i].start}${N[i].end ? " bis " + N[i].end : ""}\n\n${N[i].text}`);
const T = (s, text, o) => s.addText(text, { fontFace: "Arial", color: WHITE, margin: 0.05, valign: "top", isTextBox: true, ...o });
const img = (s, f, x, y, w, h) => s.addImage({ path: path.join(IMG, f), x, y, w, h, altText: "Foto" });
const title = (s, t, x = M, w = 12) => T(s, t, { x, y: 0.45, w, h: 0.85, fontSize: 36, bold: true, valign: "middle" });
const bullets = (s, items, o) => T(s, items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1 } })), { fontSize: 20, paraSpaceAfter: 8, ...o });
const box = (s, x, y, w, h, fill = BOX, o = {}) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { type: "none" }, ...o });
const newSlide = () => { const s = pres.addSlide(); s.background = { color: BG }; return s; };

// 1 Titel
{
  const s = newSlide();
  img(s, "s01_title.jpg", 0, 0, W, H);
  T(s, "Der Beruf", { x: M, y: 0.9, w: 8, h: 0.8, fontSize: 40, bold: true, color: GREY });
  T(s, "Autohändler", { x: M, y: 1.6, w: 9, h: 1.3, fontSize: 72, bold: true });
  T(s, "Mehr als nur Autos verkaufen.", { x: M, y: 5.95, w: 8, h: 0.6, fontSize: 26, color: WHITE });
  T(s, "Präsentation von: Name 1 und Name 2", { x: M, y: 6.55, w: 8, h: 0.45, fontSize: 16, color: GREY });
  note(s, 0);
}

// 2 Was macht ein Autohändler
{
  const s = newSlide();
  img(s, "s02_showroom.jpg", 0, 0, 5.4, H);
  title(s, "Was macht ein Autohändler?", 5.9, 7);
  bullets(s, ["Neu- und Gebrauchtwagen verkaufen", "Kunden beraten", "Autos bewerten (z. B. bei Inzahlungnahme)", "Autos ankaufen und verkaufen", "Preise verhandeln", "Finanzierung und Leasing anbieten", "Kunden auch nach dem Kauf betreuen"],
    { x: 5.9, y: 1.45, w: 6.9, h: 3.4, fontSize: 19, paraSpaceAfter: 5 });
  box(s, 5.9, 5.05, 3.3, 1.55);
  box(s, 9.45, 5.05, 3.3, 1.55);
  T(s, [{ text: "Selbstständig", options: { bold: true, color: RED, breakLine: true } }, { text: "Eigener Autohandel, eigenes Risiko. Man verdient, was als Gewinn übrig bleibt." }], { x: 6.05, y: 5.18, w: 3.0, h: 1.65, fontSize: 15 });
  T(s, [{ text: "Angestellt", options: { bold: true, color: RED, breakLine: true } }, { text: "Automobilkaufmann/-frau im Autohaus. Festes Gehalt plus Provision." }], { x: 9.6, y: 5.18, w: 3.0, h: 1.65, fontSize: 15 });
  note(s, 1);
}

// 3 Aufgaben (Ablauf)
{
  const s = newSlide();
  title(s, "Die wichtigsten Aufgaben");
  T(s, "So läuft ein Autokauf ab:", { x: M, y: 1.35, w: 10, h: 0.5, fontSize: 20, color: GREY });
  const st = [["Kunden-\nkontakt", "Begrüßen und Wünsche herausfinden"], ["Beratung", "Passendes Auto und Budget finden"], ["Probefahrt", "Das Auto ausprobieren"],
    ["Preis-\nverhandlung", "Preis, Rabatt, altes Auto"], ["Kaufvertrag", "Vertrag und Finanzierung"], ["Fahrzeug-\nübergabe", "Schlüssel übergeben, alles erklären"]];
  const bw = 1.7, gap = (W - 2 * M - 6 * bw) / 5;
  for (let i = 0; i < 6; i++) {
    const x = M + i * (bw + gap);
    box(s, x, 2.3, bw, 1.75, i === 5 ? RED : BOX);
    T(s, String(i + 1), { x: x + 0.15, y: 2.4, w: 0.6, h: 0.5, fontSize: 24, bold: true, color: i === 5 ? WHITE : RED });
    T(s, st[i][0], { x: x + 0.1, y: 2.95, w: bw - 0.2, h: 0.95, fontSize: 17, bold: true });
    T(s, st[i][1], { x, y: 4.25, w: bw, h: 1.0, fontSize: 15, color: GREY });
    if (i < 5) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + bw + 0.06, y: 3.05, w: gap - 0.12, h: 0.3, fill: { color: GREY }, line: { type: "none" } });
  }
  T(s, "Beispiel: Eine Familie sucht einen Kombi für ca. 20.000 €. Vom ersten Gespräch bis zur Übergabe dauert es oft ein paar Tage oder sogar Wochen.", { x: M, y: 5.65, w: 12.1, h: 0.9, fontSize: 17, italic: true, color: GREY });
  note(s, 2);
}

// 4 Fähigkeiten
{
  const s = newSlide();
  img(s, "s11_panel.jpg", W - 4.0, 0, 4.0, H);
  title(s, "Welche Fähigkeiten braucht man?", M, 8.6);
  bullets(s, ["Kommunikationsfähigkeit", "Verkaufstalent", "Freundlichkeit", "Verhandlungsgeschick", "Interesse an Autos und Technik", "Zuverlässigkeit", "Wirtschaftliches Denken"],
    { x: M, y: 1.55, w: 8.3, h: 3.9, fontSize: 22, paraSpaceAfter: 6 });
  box(s, M, 5.65, 8.3, 1.1, RED);
  T(s, "Ein guter Verkäufer redet nicht am meisten, sondern hört am besten zu!", { x: M + 0.25, y: 5.65, w: 7.9, h: 1.1, fontSize: 20, bold: true, valign: "middle" });
  note(s, 3);
}

// 5 Ausbildung
{
  const s = newSlide();
  title(s, "Ausbildung und Einstieg");
  bullets(s, ["Ausbildungsberuf: Automobilkaufmann/-frau", "Dauer: 3 Jahre", "Duale Ausbildung: Betrieb + Berufsschule", "Abschluss vor der IHK"], { x: M, y: 1.45, w: 6.2, h: 2.2, fontSize: 19, paraSpaceAfter: 6 });
  T(s, [{ text: "Das lernt man:", options: { bold: true, color: RED, breakLine: true } }, { text: "Kaufmännisches Wissen, Fahrzeugtechnik, Kundenberatung, Rechnungswesen und Verkauf" }], { x: 7.1, y: 1.5, w: 5.6, h: 1.8, fontSize: 19 });
  const yrs = [["1. Jahr", "Betrieb kennenlernen: Verkauf, Service, Teile"], ["2. Jahr", "Mitte des Jahres: Prüfung Teil 1"], ["3. Jahr", "Prüfung Teil 2 vor der IHK, dann fertig!"]];
  const yw = (W - 2 * M - 0.5) / 3;
  for (let i = 0; i < 3; i++) {
    const x = M + i * (yw + 0.25);
    box(s, x, 3.65, yw, 1.45);
    T(s, yrs[i][0], { x: x + 0.2, y: 3.75, w: yw - 0.4, h: 0.45, fontSize: 20, bold: true, color: RED });
    T(s, yrs[i][1], { x: x + 0.2, y: 4.2, w: yw - 0.4, h: 0.8, fontSize: 16 });
  }
  box(s, M, 5.4, W - 2 * M, 1.4, BLACK, { line: { color: RED, width: 1.5 } });
  T(s, [{ text: "Ohne Ausbildung selbstständig?", options: { bold: true, breakLine: true } }, { text: "Geht, denn Autohandel ist kein Meisterberuf. Aber man muss ein Gewerbe anmelden, Steuern und Buchhaltung machen und die Gewährleistung für Kunden beachten.", options: { color: GREY } }],
    { x: M + 0.25, y: 5.5, w: 11.6, h: 1.25, fontSize: 17 });
  note(s, 4);
}

// 6 Arbeitstag
{
  const s = newSlide();
  img(s, "s06_showroom.jpg", W - 6.0, 0, 6.0, H);
  title(s, "Ein typischer Arbeitstag", M, 6.8);
  T(s, "(Beispiel, die Zeiten sind in jedem Betrieb anders)", { x: M, y: 1.25, w: 6.6, h: 0.4, fontSize: 15, italic: true, color: GREY });
  const d = [["09:00", "Vorbereitung, Fahrzeugbestand prüfen"], ["10:00", "Kundengespräche und Beratung"], ["12:00", "Probefahrten"], ["14:00", "Preisverhandlungen und Angebote"], ["15:30", "Kaufverträge und Finanzierung"], ["17:00", "Fahrzeugübergabe und Feierabend"]];
  for (let i = 0; i < 6; i++) {
    const y = 1.95 + i * 0.8;
    T(s, d[i][0] + " Uhr", { x: M, y, w: 1.6, h: 0.5, fontSize: 19, bold: true, color: RED });
    T(s, d[i][1], { x: M + 1.65, y, w: 5.0, h: 0.5, fontSize: 19 });
  }
  note(s, 5);
}

// 7 Gehalt
{
  const s = newSlide();
  title(s, "Gehalt und Verdienst");
  // linke Seite: Ausbildungsvergütung als einfache Balken
  T(s, [{ text: "Ausbildungsvergütung", options: { bold: true, breakLine: true } }, { text: "brutto pro Monat (Tarif West, 2025)", options: { fontSize: 14, color: GREY } }], { x: M, y: 1.4, w: 5.6, h: 0.8, fontSize: 20 });
  const v = [1103, 1149, 1225], maxH = 2.6, base = 5.55;
  for (let i = 0; i < 3; i++) {
    const h = (v[i] / 1300) * maxH, x = M + 0.2 + i * 1.75;
    s.addShape(pres.shapes.RECTANGLE, { x, y: base - h, w: 1.2, h, fill: { color: RED }, line: { type: "none" } });
    T(s, v[i].toLocaleString("de-DE") + " €", { x: x - 0.2, y: base - h - 0.45, w: 1.6, h: 0.4, fontSize: 16, bold: true, align: "center" });
    T(s, `${i + 1}. Jahr`, { x: x - 0.2, y: base + 0.08, w: 1.6, h: 0.4, fontSize: 15, color: GREY, align: "center" });
  }
  T(s, "Im Osten etwas weniger (1.051 bis 1.139 €).", { x: M, y: 6.05, w: 5.6, h: 0.4, fontSize: 14, color: GREY });
  // rechte Seite
  const rx = 7.0;
  T(s, "Nach der Ausbildung:", { x: rx, y: 1.4, w: 5.7, h: 0.5, fontSize: 20, bold: true });
  T(s, "4.238 €", { x: rx, y: 1.9, w: 5.7, h: 1.0, fontSize: 54, bold: true, color: RED });
  T(s, "brutto im Monat (Median, Vollzeit)", { x: rx, y: 2.85, w: 5.7, h: 0.4, fontSize: 16, color: GREY });
  bullets(s, ["Spanne: 3.259 € bis 5.866 €", "Am Anfang eher weniger", "Netto bleiben ca. 2.700 € übrig*", "Dazu oft Provision für jedes verkaufte Auto", "Selbstständig: kein festes Gehalt"], { x: rx, y: 3.45, w: 5.7, h: 2.9, fontSize: 17, paraSpaceAfter: 5 });
  T(s, "Quellen: BIBB (Stand 01.10.2025), Entgeltatlas der Bundesagentur für Arbeit. *grob geschätzt: Steuerklasse I, ohne Kinder, ohne Kirchensteuer", { x: M, y: 6.75, w: 12.1, h: 0.45, fontSize: 11, color: GREY });
  note(s, 6);
}

// 8 Vor- und Nachteile
{
  const s = newSlide();
  img(s, "s08_bg.jpg", 0, 0, W, H);
  title(s, "Vor- und Nachteile");
  const cw = (W - 2 * M - 0.4) / 2;
  box(s, M, 1.55, cw, 4.8, BLACK, { fill: { color: BLACK, transparency: 25 } });
  box(s, M + cw + 0.4, 1.55, cw, 4.8, BLACK, { fill: { color: BLACK, transparency: 25 } });
  T(s, "+  Vorteile", { x: M + 0.3, y: 1.75, w: cw - 0.6, h: 0.6, fontSize: 26, bold: true });
  T(s, "−  Nachteile", { x: M + cw + 0.7, y: 1.75, w: cw - 0.6, h: 0.6, fontSize: 26, bold: true, color: RED });
  bullets(s, ["Abwechslungsreicher Arbeitsalltag", "Kontakt mit Menschen", "Gute Verdienstmöglichkeiten", "Entwicklungsmöglichkeiten", "Man kann sich selbstständig machen"], { x: M + 0.3, y: 2.6, w: cw - 0.6, h: 3.6, fontSize: 21, paraSpaceAfter: 14 });
  bullets(s, ["Verkaufsdruck", "Schwierige Kundengespräche", "Viel Konkurrenz", "Je nach Betrieb Arbeit am Wochenende", "Selbstständig: Einnahmen schwanken"], { x: M + cw + 0.7, y: 2.6, w: cw - 0.6, h: 3.6, fontSize: 21, paraSpaceAfter: 14 });
  note(s, 7);
}

// 9 Zukunft
{
  const s = newSlide();
  img(s, "s09_charge.jpg", W - 5.2, 0, 5.2, H);
  title(s, "Die Zukunft des Berufs", M, 7.2);
  bullets(s, ["Elektroautos", "Digitalisierung", "Autos online verkaufen", "Künstliche Intelligenz (KI)", "Neue Kundenwünsche (z. B. Leasing, Auto-Abo)"], { x: M, y: 1.45, w: 7.0, h: 2.9, fontSize: 20, paraSpaceAfter: 6 });
  box(s, M, 4.45, 7.0, 0.95);
  T(s, [{ text: "19,1 % ", options: { bold: true, color: RED, fontSize: 26 } }, { text: "aller neuen Autos 2025 waren Elektroautos (KBA)" }], { x: M + 0.2, y: 4.45, w: 6.7, h: 0.95, fontSize: 16, valign: "middle" });
  T(s, [{ text: "Warum braucht man trotzdem Verkäufer?", options: { bold: true, breakLine: true } }, { text: "Ein Auto kostet viel Geld. Deshalb wollen die meisten Kunden eine Probefahrt und eine ehrliche, persönliche Beratung.", options: { color: GREY } }],
    { x: M, y: 5.6, w: 7.0, h: 1.4, fontSize: 17 });
  note(s, 8);
}

// 10 Fazit
{
  const s = newSlide();
  img(s, "s10_bg.jpg", 0, 0, W, H);
  T(s, "Fazit", { x: M, y: 0.6, w: 4, h: 0.5, fontSize: 22, bold: true, color: RED });
  T(s, "Mehr als nur Autos verkaufen!", { x: M, y: 1.1, w: 7.0, h: 1.8, fontSize: 46, bold: true });
  T(s, "Ein erfolgreicher Autohändler braucht:", { x: M, y: 3.1, w: 7, h: 0.5, fontSize: 19, color: GREY });
  bullets(s, ["Verkaufstalent", "Menschenkenntnis", "Wirtschaftliches Denken", "Interesse an Autos"], { x: M, y: 3.6, w: 6.5, h: 1.9, fontSize: 21, paraSpaceAfter: 4, bold: true });
  box(s, M, 5.6, 6.8, 1.35, RED);
  T(s, [{ text: "Frage an euch:", options: { breakLine: true, fontSize: 15 } }, { text: "Könntet ihr euch vorstellen, später selbstständig einen Autohandel zu führen?", options: { bold: true } }], { x: M + 0.25, y: 5.7, w: 6.4, h: 1.2, fontSize: 19 });
  note(s, 9);
}

// 11 Quellen
{
  const s = newSlide();
  title(s, "Quellen");
  const q = [
    "Bundesagentur für Arbeit, BERUFENET: Automobilkaufmann/-frau (web.arbeitsagentur.de/berufenet)",
    "Bundesagentur für Arbeit, Entgeltatlas: Automobilkaufmann/-frau (web.arbeitsagentur.de/entgeltatlas/beruf/6619)",
    "BIBB: Tarifliche Ausbildungsvergütungen 2025 (bibb.de/ausbildungsverguetung)",
    "Verordnung über die Berufsausbildung zum Automobilkaufmann (gesetze-im-internet.de/autokflausbv)",
    "IHK: Ausbildungsberuf Automobilkaufmann/-frau (ihk.de)",
    "Gewerbeordnung § 14, Gewerbeanmeldung (gesetze-im-internet.de/gewo/__14.html)",
    "Kraftfahrt-Bundesamt: Neuzulassungen 2025 (kba.de)",
    "Bilder: Unsplash und Pexels (freie Lizenz)",
  ];
  bullets(s, q, { x: M, y: 1.5, w: 12.1, h: 5.3, fontSize: 16, paraSpaceAfter: 8, color: GREY });
  note(s, 10);
}

pres.writeFile({ fileName: OUT }).then(() => console.log("written", OUT));
