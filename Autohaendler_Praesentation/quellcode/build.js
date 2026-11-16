const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const TB = require("react-icons/tb");
const path = require("path");
const { applyTheme } = require("/root/.claude/skills/synced/079eb6aa-1ac3-4a7a-95ec-062edcd91295_7c90c2a5-bd71-4d2d-891d-eb4afb3d51e1/pptx/scripts/apply_theme.js");
const NOTES = require("./notes.js");

const IMG = path.join(__dirname, "..", "img");
const OUT = process.argv[2] || "deck.pptx";

const HEX = { black: "090A0B", anth: "151719", white: "FFFFFF", red: "E63935", grey: "BFC3C7", card: "1C1F22", line: "3A3E42" };
const THEME = {
  name: "Autohaus Premium",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: HEX.black, lt1: HEX.white, dk2: HEX.anth, lt2: HEX.grey,
    accent1: HEX.red, accent2: "8E9297", accent3: HEX.card, accent4: "5A5F64", accent5: "B22B28", accent6: "D9DCDF",
    hlink: HEX.red, folHlink: "8E9297",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Der Beruf Autohändler";
pres.subject = "Berufspräsentation Klasse 10";
pres.author = "Klasse 10";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const COL = { black: C.text1, anth: C.text2, white: C.background1, grey: C.background2, red: C.accent1, card: C.accent3, mid: C.accent2, dim: C.accent4 };

const W = 13.333, M = 0.6;

// ---------- icons ----------
const iconCache = {};
async function icon(name, color = "#FFFFFF") {
  const key = name + color;
  if (iconCache[key]) return iconCache[key];
  const svg = RDS.renderToStaticMarkup(React.createElement(TB[name], { color, size: 256, strokeWidth: 1.6 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return (iconCache[key] = "image/png;base64," + buf.toString("base64"));
}

// ---------- layouts ----------
const footer = (x = M) => [
  { text: { text: "DER BERUF AUTOHÄNDLER", options: { x, y: 7.0, w: 4, h: 0.25, fontSize: 9, color: COL.dim, bold: true, charSpacing: 3, margin: 0, fontFace: "Arial" } } },
];
const titleOpts = (x, w) => ({
  placeholder: { options: { name: "title", type: "title", x, y: 0.82, w, h: 0.85, fontSize: 34, bold: true, color: COL.white, fontFace: "Arial", valign: "top", margin: 0, align: "left" }, text: "" },
});
const kickerOpts = (x, w) => ({
  placeholder: { options: { name: "kicker", type: "body", x, y: 0.45, w, h: 0.3, fontSize: 12, bold: true, color: COL.red, fontFace: "Arial", charSpacing: 4, margin: 0, valign: "top", align: "left" }, text: "" },
});
const slideNum = (x = 12.13) => ({ x, y: 6.97, w: 0.6, h: 0.3, fontSize: 9, color: COL.dim, align: "right", fontFace: "Arial" });

pres.defineSlideMaster({ title: "Inhalt dunkel", background: { color: HEX.black },
  objects: [...footer(), kickerOpts(M, 9), titleOpts(M, 12.1)], slideNumber: slideNum() });
pres.defineSlideMaster({ title: "Bild links", background: { color: HEX.black },
  objects: [...footer(6.0), kickerOpts(6.0, 6.7), titleOpts(6.0, 6.75)], slideNumber: slideNum() });
pres.defineSlideMaster({ title: "Bild rechts", background: { color: HEX.black },
  objects: [...footer(), kickerOpts(M, 6.5), titleOpts(M, 6.9)], slideNumber: slideNum(6.6) });
pres.defineSlideMaster({ title: "Titel", background: { color: HEX.black },
  objects: [{ placeholder: { options: { name: "title", type: "title", x: M, y: 1.15, w: 8.5, h: 2.3, fontSize: 66, bold: true, color: COL.white, fontFace: "Arial", valign: "top", margin: 0, align: "left", lineSpacingMultiple: 0.9 }, text: "" } }] });
pres.defineSlideMaster({ title: "Abschluss", background: { color: HEX.black },
  objects: [{ placeholder: { options: { name: "title", type: "title", x: M, y: 1.2, w: 7.2, h: 2.1, fontSize: 50, bold: true, color: COL.white, fontFace: "Arial", valign: "top", margin: 0, align: "left", lineSpacingMultiple: 0.92 }, text: "" } }] });

// ---------- helpers ----------
let animCounter = 0;
const A = (eff, nm) => `A${String(++animCounter).padStart(2, "0")}${eff}_${nm}`; // objectName encodes animation order + effect
const resetAnim = () => (animCounter = 0);
const T = (s, text, o) => s.addText(text, { isTextBox: true, fontFace: "Arial", margin: 0, color: COL.white, valign: "top", ...o });
const kick = (s, t) => s.addText(t, { placeholder: "kicker" });
const title = (s, t) => s.addText(t, { placeholder: "title" });
const fullBg = (s, file, nm) => s.addImage({ path: path.join(IMG, file), x: 0, y: 0, w: W, h: 7.5, objectName: nm, altText: "Hintergrundbild Fahrzeug" });
const circleIcon = async (s, x, y, d, ic, o = {}) => {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: o.fill || COL.card }, line: o.line ? { color: o.line, width: o.lw || 1.5 } : { type: "none" }, objectName: o.nm ? o.nm + "_kreis" : undefined });
  const p = d * (o.pad ?? 0.24);
  s.addImage({ data: await icon(ic, o.ic || "#FFFFFF"), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, objectName: o.nm ? o.nm + "_icon" : undefined, altText: "Icon" });
};
const src = (s, t, x = M, y = 6.62, w = 12.1) => T(s, t, { x, y, w, h: 0.28, fontSize: 9, color: COL.mid, objectName: "Quelle" });

async function build() {
  // =============== 1 TITLE ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Titel" });
    fullBg(s, "s01_title.jpg", A("z", "Hintergrundbild"));
    T(s, "BERUFSPRÄSENTATION  ·  KLASSE 10", { x: M, y: 0.62, w: 7, h: 0.3, fontSize: 12, bold: true, color: COL.red, charSpacing: 5, objectName: A("f", "Kicker") });
    s.addText([{ text: "DER BERUF", options: { breakLine: true, fontSize: 40, color: COL.grey } }, { text: "AUTOHÄNDLER" }], { placeholder: "title" });
    T(s, [{ text: "Mehr als nur Autos verkaufen" }, { text: ".", options: { color: COL.red } }], { x: M, y: 6.05, w: 7, h: 0.5, fontSize: 24, color: COL.white, objectName: A("w", "Untertitel") });
    T(s, "Name 1  ·  Name 2  ·  Datum", { x: M, y: 6.62, w: 6, h: 0.3, fontSize: 12, color: COL.mid, objectName: A("f", "Namen") });
    s.addNotes(NOTES[0]);
  }

  // =============== 2 WAS MACHT ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Bild links" });
    s.addImage({ path: path.join(IMG, "s02_showroom.jpg"), x: 0, y: 0, w: 5.4, h: 7.5, objectName: A("f", "Bild_Autohaus"), altText: "Verkaufsberatung im Autohaus" });
    T(s, "Beratung im Autohaus", { x: 0.45, y: 6.85, w: 4.5, h: 0.3, fontSize: 11, color: COL.grey, objectName: "Bildunterschrift" });
    kick(s, "01  ·  BERUFSBILD"); title(s, "Was macht ein Autohändler?");
    const items = [
      ["TbCar", "Neu- & Gebrauchtwagen"], ["TbMessages", "Kunden beraten"], ["TbSearch", "Fahrzeuge bewerten"], ["TbArrowsExchange", "Autos an- & verkaufen"],
      ["TbScale", "Preise verhandeln"], ["TbCoins", "Finanzierung & Leasing"], ["TbUserHeart", "Kunden betreuen"],
    ];
    for (let i = 0; i < items.length; i++) {
      const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
      const x = 6.0 + col * 3.45, y = 1.95 + row * 0.64;
      const nm = A("f", "Aufgabe" + (i + 1));
      await circleIcon(s, x, y, 0.46, items[i][0], { fill: COL.card, ic: "#E63935", nm });
      T(s, items[i][1], { x: x + 0.6, y: y + 0.04, w: 2.75, h: 0.4, fontSize: 15, valign: "middle", objectName: nm });
    }
    T(s, "ZWEI WEGE IN DEN BERUF", { x: 6.0, y: 4.62, w: 5, h: 0.25, fontSize: 11, bold: true, color: COL.mid, charSpacing: 3, objectName: "Label_Wege" });
    const cards = [
      ["TbBuildingStore", "SELBSTSTÄNDIG", "Eigener Autohandel: Chef/Chefin, eigenes Risiko, Einkommen = Gewinn."],
      ["TbBriefcase", "ANGESTELLT", "Automobilkaufmann/-frau im Autohaus: festes Gehalt plus Provision."],
    ];
    for (let i = 0; i < 2; i++) {
      const x = 6.0 + i * 3.45, nm = A("w", "Karte_" + cards[i][1]);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.98, w: 3.25, h: 1.72, rectRadius: 0.08, fill: { color: COL.anth }, line: { color: HEX.line, width: 0.75 }, objectName: nm });
      s.addImage({ data: await icon(cards[i][0], "#E63935"), x: x + 0.25, y: 5.18, w: 0.36, h: 0.36, objectName: nm + "_icon" });
      T(s, cards[i][1], { x: x + 0.72, y: 5.22, w: 2.4, h: 0.3, fontSize: 13, bold: true, charSpacing: 2, objectName: nm + "_kopf" });
      T(s, cards[i][2], { x: x + 0.25, y: 5.68, w: 2.8, h: 0.9, fontSize: 14, color: COL.grey, objectName: nm + "_text" });
    }
    s.addNotes(NOTES[1]);
  }

  // =============== 3 PROCESS ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Inhalt dunkel" });
    kick(s, "02  ·  AUFGABEN"); title(s, "Die wichtigsten Aufgaben");
    T(s, "Vom ersten „Hallo“ bis zur Schlüsselübergabe – so läuft ein Autokauf ab.", { x: M, y: 1.72, w: 11, h: 0.4, fontSize: 18, color: COL.grey, objectName: "Unterzeile" });
    const steps = [
      ["TbUsers", "Kundenkontakt", "Begrüßen, zuhören, Wünsche erkennen"],
      ["TbMessages", "Beratung", "Passendes Auto und Budget finden"],
      ["TbSteeringWheel", "Probefahrt", "Das Auto live erleben und testen"],
      ["TbScale", "Preisverhandlung", "Preis, Rabatt, Inzahlungnahme"],
      ["TbFileText", "Kaufvertrag", "Vertrag, Finanzierung, Zulassung"],
      ["TbKey", "Fahrzeugübergabe", "Schlüssel, Erklärung, Glückwunsch"],
    ];
    const colW = (W - 2 * M) / 6, d = 1.15, cy = 2.75;
    s.addShape(pres.shapes.LINE, { x: M + colW / 2, y: cy + d / 2, w: colW * 5, h: 0, line: { color: HEX.line, width: 1.5, dashType: "dash" }, objectName: A("w", "Prozesslinie") });
    for (let i = 0; i < 6; i++) {
      const cx = M + colW * i + colW / 2, nm = A("f", "Schritt" + (i + 1));
      await circleIcon(s, cx - d / 2, cy, d, steps[i][0], { fill: i === 5 ? COL.red : COL.anth, line: i === 5 ? undefined : COL.red, lw: 2, ic: "#FFFFFF", pad: 0.27, nm });
      T(s, String(i + 1).padStart(2, "0"), { x: cx - 0.5, y: 2.3, w: 1, h: 0.3, fontSize: 13, bold: true, color: COL.red, align: "center", charSpacing: 2, objectName: nm + "_nr" });
      T(s, steps[i][1], { x: cx - colW / 2, y: 4.15, w: colW, h: 0.38, fontSize: 15, bold: true, align: "center", objectName: nm + "_titel" });
      T(s, steps[i][2], { x: cx - colW / 2 + 0.12, y: 4.58, w: colW - 0.24, h: 0.8, fontSize: 14, color: COL.grey, align: "center", objectName: nm + "_text" });
    }
    const nm = A("f", "Praxisbeispiel");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.75, w: W - 2 * M, h: 0.82, rectRadius: 0.08, fill: { color: COL.anth }, line: { color: HEX.line, width: 0.75 }, objectName: nm });
    s.addImage({ data: await icon("TbBulb", "#E63935"), x: M + 0.28, y: 5.95, w: 0.42, h: 0.42, objectName: nm + "_icon" });
    T(s, [{ text: "Praxisbeispiel: ", options: { bold: true, color: COL.white } }, { text: "Eine Familie sucht einen Kombi für ca. 20.000 €. Vom ersten Gespräch bis zur Übergabe vergehen oft mehrere Tage oder Wochen." }],
      { x: M + 0.9, y: 5.82, w: 11, h: 0.68, fontSize: 14, color: COL.grey, valign: "middle", objectName: nm + "_text" });
    s.addNotes(NOTES[2]);
  }

  // =============== 4 SKILLS ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Inhalt dunkel" });
    s.background = { path: path.join(IMG, "s04_bg.jpg") };
    kick(s, "03  ·  FÄHIGKEITEN"); title(s, "Welche Fähigkeiten braucht man?");
    const sk = [
      ["TbMessageCircle", "Kommunikations-\nfähigkeit", "Verständlich erklären, gut zuhören"],
      ["TbTrendingUp", "Verkaufstalent", "Begeistern, ohne zu drängen"],
      ["TbMoodSmile", "Freundlichkeit", "Der erste Eindruck zählt"],
      ["TbHeartHandshake", "Verhandlungsgeschick", "Ein fairer Preis für beide Seiten"],
      ["TbSteeringWheel", "Interesse an Autos & Technik", "E-Antrieb, Assistenzsysteme & Co."],
      ["TbShieldCheck", "Zuverlässigkeit", "Termine und Zusagen einhalten"],
      ["TbCalculator", "Wirtschaftliches Denken", "Kosten, Gewinn und Rabatte im Blick"],
    ];
    const cw = 2.8, gap = (W - 2 * M - 4 * cw) / 3, ch = 2.15;
    for (let i = 0; i < 8; i++) {
      const x = M + (i % 4) * (cw + gap), y = 1.95 + Math.floor(i / 4) * (ch + 0.25);
      const nm = A("f", i < 7 ? "Faehigkeit" + (i + 1) : "Tipp");
      if (i === 7) {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: COL.red }, line: { type: "none" }, objectName: nm });
        s.addImage({ data: await icon("TbBulb", "#FFFFFF"), x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, objectName: nm + "_icon" });
        T(s, "Ein guter Verkäufer redet nicht am meisten – er hört am besten zu.", { x: x + 0.25, y: y + 0.95, w: cw - 0.45, h: 1.05, fontSize: 16, bold: true, objectName: nm + "_text" });
        continue;
      }
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: COL.anth, transparency: 8 }, line: { color: HEX.line, width: 0.75 }, objectName: nm });
      await circleIcon(s, x + 0.25, y + 0.25, 0.6, sk[i][0], { fill: COL.black, line: COL.red, lw: 1.25, ic: "#E63935", nm });
      T(s, sk[i][1], { x: x + 0.25, y: y + 0.98, w: cw - 0.4, h: 0.55, fontSize: 15, bold: true, valign: "top", objectName: nm + "_titel" });
      T(s, sk[i][2], { x: x + 0.25, y: y + 1.53, w: cw - 0.4, h: 0.52, fontSize: 13, color: COL.grey, objectName: nm + "_text" });
    }
    s.addNotes(NOTES[3]);
  }

  // =============== 5 AUSBILDUNG ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Inhalt dunkel" });
    kick(s, "04  ·  AUSBILDUNG"); title(s, "Ausbildung & Einstieg");
    let nm = A("f", "Stat_3Jahre");
    T(s, "3", { x: M, y: 1.75, w: 1.2, h: 1.45, fontSize: 110, bold: true, color: COL.red, objectName: nm, valign: "top" });
    T(s, "JAHRE", { x: M + 1.15, y: 2.35, w: 2.2, h: 0.4, fontSize: 24, bold: true, charSpacing: 4, objectName: nm + "_jahre" });
    T(s, "Ausbildung", { x: M + 1.15, y: 2.75, w: 2.4, h: 0.35, fontSize: 15, color: COL.grey, objectName: nm + "_label" });
    T(s, "Duale Ausbildung zum/zur Automobilkaufmann/-frau mit Abschluss vor der IHK", { x: M, y: 3.45, w: 3.6, h: 0.8, fontSize: 15, color: COL.white, objectName: A("f", "Beschreibung") });
    const lr = [["TbBuildingStore", "Betrieb", "Praxis im Autohaus"], ["TbSchool", "Berufsschule", "Theorie im Unterricht"]];
    for (let i = 0; i < 2; i++) {
      const y = 4.45 + i * 0.6; nm = A("f", "Lernort" + (i + 1));
      await circleIcon(s, M, y, 0.5, lr[i][0], { fill: COL.card, ic: "#E63935", nm });
      T(s, [{ text: lr[i][1], options: { bold: true, breakLine: true } }, { text: lr[i][2], options: { color: COL.grey, fontSize: 13 } }], { x: M + 0.65, y: y - 0.04, w: 3, h: 0.6, fontSize: 15, valign: "middle", objectName: nm + "_text" });
    }
    // timeline
    const tx = 4.75, tw = W - M - tx, ty = 2.25;
    s.addShape(pres.shapes.LINE, { x: tx, y: ty, w: tw, h: 0, line: { color: HEX.line, width: 2 }, objectName: A("w", "Zeitstrahl") });
    const yrs = [
      ["1. JAHR", "Start", "Betrieb kennenlernen: Verkauf, Service, Teile & Zubehör"],
      ["2. JAHR", "Prüfung Teil 1", "Mitte des 2. Jahres: Warenwirtschaft & Werkstattprozesse"],
      ["3. JAHR", "Abschluss", "Prüfung Teil 2 vor der IHK – dann ausgelernt"],
    ];
    const yw = (tw - 0.5) / 3;
    for (let i = 0; i < 3; i++) {
      const x = tx + i * (yw + 0.25); nm = A("f", "Jahr" + (i + 1));
      T(s, yrs[i][0], { x, y: ty - 0.45, w: yw, h: 0.3, fontSize: 13, bold: true, color: COL.red, charSpacing: 3, objectName: nm + "_label" });
      s.addShape(pres.shapes.OVAL, { x, y: ty - 0.11, w: 0.22, h: 0.22, fill: { color: i === 2 ? COL.red : COL.black }, line: { color: HEX.red, width: 2 }, objectName: nm + "_punkt" });
      T(s, yrs[i][1], { x, y: ty + 0.3, w: yw, h: 0.35, fontSize: 17, bold: true, objectName: nm + "_titel" });
      T(s, yrs[i][2], { x, y: ty + 0.7, w: yw - 0.1, h: 0.95, fontSize: 14, color: COL.grey, objectName: nm });
    }
    T(s, "DAS LERNST DU", { x: tx, y: 4.08, w: 4, h: 0.25, fontSize: 11, bold: true, color: COL.mid, charSpacing: 3, objectName: "Label_Inhalte" });
    const chips = [["TbBriefcase", "Kaufmännisches Wissen"], ["TbTool", "Fahrzeugtechnik"], ["TbMessages", "Kundenberatung"], ["TbCalculator", "Rechnungswesen & Verkauf"]];
    const cw2 = (tw - 0.25) / 2;
    for (let i = 0; i < 4; i++) {
      const x = tx + (i % 2) * (cw2 + 0.25), y = 4.42 + Math.floor(i / 2) * 0.55; nm = A("f", "Inhalt" + (i + 1));
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw2, h: 0.44, rectRadius: 0.22, fill: { color: COL.anth }, line: { color: HEX.line, width: 0.75 }, objectName: nm });
      s.addImage({ data: await icon(chips[i][0], "#E63935"), x: x + 0.18, y: y + 0.09, w: 0.26, h: 0.26, objectName: nm + "_icon" });
      T(s, chips[i][1], { x: x + 0.58, y, w: cw2 - 0.7, h: 0.44, fontSize: 14, valign: "middle", objectName: nm + "_text" });
    }
    nm = A("w", "Selbststaendig_Hinweis");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.68, w: W - 2 * M, h: 0.95, rectRadius: 0.08, fill: { color: COL.card }, line: { color: HEX.red, width: 1 }, objectName: nm });
    s.addImage({ data: await icon("TbAlertTriangle", "#E63935"), x: M + 0.28, y: 5.93, w: 0.45, h: 0.45, objectName: nm + "_icon" });
    T(s, [{ text: "Selbstständig ohne Ausbildung? ", options: { bold: true, color: COL.white } }, { text: "Möglich – Autohandel ist kein Meisterberuf. Aber Pflicht: Gewerbe anmelden, Steuern & Buchhaltung, Gewährleistung gegenüber Kunden beachten." }],
      { x: M + 0.95, y: 5.72, w: 11.0, h: 0.87, fontSize: 14, color: COL.grey, valign: "middle", objectName: nm + "_text" });
    s.addNotes(NOTES[4]);
  }

  // =============== 6 ARBEITSTAG ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Bild rechts" });
    s.addImage({ path: path.join(IMG, "s06_showroom.jpg"), x: W - 6.0, y: 0, w: 6.0, h: 7.5, objectName: A("f", "Bild_Showroom"), altText: "Sportwagen im Showroom" });
    kick(s, "05  ·  ALLTAG"); title(s, "Ein typischer Arbeitstag");
    T(s, "Beispiel – Arbeitszeiten variieren je nach Betrieb.", { x: M, y: 1.68, w: 6.5, h: 0.35, fontSize: 14, italic: true, color: COL.mid, objectName: "Hinweis_Beispiel" });
    const day = [
      ["09:00", "Vorbereitung & Fahrzeugbestand prüfen", "Neue Autos, E-Mails und Termine checken"],
      ["10:00", "Kundengespräche & Beratung", "Fragen klären, Modelle vergleichen"],
      ["12:00", "Probefahrten", "Kunden testen ihr Wunschauto"],
      ["14:00", "Preisverhandlungen & Angebote", "Angebote rechnen, Inzahlungnahme bewerten"],
      ["15:30", "Kaufverträge & Finanzierung", "Verträge, Kredit oder Leasing abschließen"],
      ["17:00", "Fahrzeugübergabe & Tagesabschluss", "Auto übergeben, Unterlagen sortieren"],
    ];
    const y0 = 2.3, step = 0.73;
    s.addShape(pres.shapes.LINE, { x: M + 0.08, y: y0 + 0.15, w: 0, h: step * 5, line: { color: HEX.line, width: 1.5 }, objectName: A("w", "Zeitlinie") });
    for (let i = 0; i < 6; i++) {
      const y = y0 + i * step, nm = A("f", "Uhrzeit" + (i + 1));
      s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.07, w: 0.16, h: 0.16, fill: { color: COL.red }, line: { type: "none" }, objectName: nm + "_punkt" });
      T(s, day[i][0], { x: M + 0.38, y: y - 0.02, w: 1.1, h: 0.36, fontSize: 19, bold: true, color: COL.red, objectName: nm });
      T(s, day[i][1], { x: M + 1.55, y: y - 0.01, w: 5.0, h: 0.34, fontSize: 16, bold: true, objectName: nm + "_titel" });
      T(s, day[i][2], { x: M + 1.55, y: y + 0.32, w: 5.0, h: 0.3, fontSize: 13, color: COL.grey, objectName: nm + "_text" });
    }
    s.addNotes(NOTES[5]);
  }

  // =============== 7 GEHALT ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Inhalt dunkel" });
    kick(s, "06  ·  VERDIENST"); title(s, "Gehalt & Verdienstmöglichkeiten");
    // left card chart
    let nm = A("f", "Karte_Ausbildung");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.9, w: 5.5, h: 4.6, rectRadius: 0.08, fill: { color: COL.anth }, line: { color: HEX.line, width: 0.75 }, objectName: nm });
    T(s, "AUSBILDUNGSVERGÜTUNG", { x: M + 0.3, y: 2.12, w: 4.9, h: 0.28, fontSize: 12, bold: true, color: COL.red, charSpacing: 3, objectName: nm + "_kopf" });
    T(s, "Brutto pro Monat · tariflich · Westdeutschland 2025", { x: M + 0.3, y: 2.42, w: 4.9, h: 0.3, fontSize: 13, color: COL.grey, objectName: nm + "_unter" });
    s.addChart(pres.charts.BAR, [{ name: "Ausbildungsvergütung (€ brutto)", labels: ["1. Jahr", "2. Jahr", "3. Jahr"], values: [1103, 1149, 1225] }], {
      x: M + 0.15, y: 2.8, w: 5.2, h: 2.95, barDir: "col", barGapWidthPct: 55,
      chartColors: [HEX.red], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '#"."##0" €"', dataLabelColor: HEX.white, dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelFontFace: "+mn-lt",
      catAxisLabelColor: HEX.grey, catAxisLabelFontSize: 13, catAxisLabelFontFace: "+mn-lt", catAxisLineShow: false,
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: 1400, valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: false, showTitle: false, objectName: A("f", "Diagramm_Ausbildung"), plotArea: { fill: { color: HEX.anth } }, chartArea: { fill: { color: HEX.anth } },
    });
    T(s, "Ostdeutschland: 1.051 – 1.139 €. Betriebe ohne Tarif dürfen weniger zahlen (nicht unter die gesetzliche Mindestvergütung).", { x: M + 0.3, y: 5.78, w: 4.9, h: 0.62, fontSize: 11, color: COL.mid, objectName: nm + "_fuss" });

    // right stats
    const rx = 6.6, rw = W - M - rx;
    nm = A("f", "Stat_Median");
    T(s, "4.238 €", { x: rx, y: 1.8, w: 3.9, h: 1.0, fontSize: 60, bold: true, objectName: nm });
    T(s, [{ text: "Mittleres Gehalt (Median)", options: { bold: true, color: COL.white, breakLine: true } }, { text: "brutto/Monat, Fachkräfte in Vollzeit" }], { x: rx + 3.95, y: 1.98, w: 2.2, h: 0.75, fontSize: 13, color: COL.grey, objectName: nm + "_label" });
    // range bar
    nm = A("w", "Spanne");
    const by = 3.25, bx = rx, bw = rw;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: by, w: bw, h: 0.14, rectRadius: 0.07, fill: { color: COL.card }, line: { type: "none" }, objectName: nm + "_hintergrund" });
    const sc = v => bx + ((v - 2500) / (6500 - 2500)) * bw;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sc(3259), y: by, w: sc(5866) - sc(3259), h: 0.14, rectRadius: 0.07, fill: { color: COL.red }, line: { type: "none" }, objectName: nm });
    s.addShape(pres.shapes.OVAL, { x: sc(4238) - 0.13, y: by - 0.06, w: 0.26, h: 0.26, fill: { color: COL.white }, line: { color: HEX.red, width: 2 }, objectName: nm + "_median" });
    T(s, "3.259 €", { x: sc(3259) - 0.6, y: by + 0.27, w: 1.2, h: 0.3, fontSize: 14, bold: true, align: "center", objectName: nm + "_q1" });
    T(s, "5.866 €", { x: sc(5866) - 0.6, y: by + 0.27, w: 1.2, h: 0.3, fontSize: 14, bold: true, align: "center", objectName: nm + "_q3" });
    T(s, "Die mittleren 50 % verdienen zwischen diesen Werten. Berufseinsteiger starten meist im unteren Bereich.", { x: rx, y: by + 0.62, w: rw, h: 0.5, fontSize: 13, color: COL.grey, objectName: nm + "_text" });
    // tiles
    const tiles = [
      ["TbReportMoney", "Brutto ≠ Netto", "Von 4.238 € bleiben ca. 2.700 €.*"],
      ["TbTrendingUp", "Provision & Boni", "Extra-Geld pro verkauftem Auto."],
      ["TbBuildingStore", "Selbstständig", "Kein Fixgehalt – Einkommen = Gewinn."],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 4.5 + i * 0.68; nm = A("f", "Info" + (i + 1));
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y, w: rw, h: 0.58, rectRadius: 0.08, fill: { color: COL.anth }, line: { color: HEX.line, width: 0.75 }, objectName: nm });
      s.addImage({ data: await icon(tiles[i][0], "#E63935"), x: rx + 0.2, y: y + 0.13, w: 0.32, h: 0.32, objectName: nm + "_icon" });
      T(s, [{ text: tiles[i][1] + ":  ", options: { bold: true, color: COL.white } }, { text: tiles[i][2] }], { x: rx + 0.68, y, w: rw - 0.8, h: 0.58, fontSize: 14, color: COL.grey, valign: "middle", objectName: nm + "_text" });
    }
    src(s, "Quellen: BIBB-Datenbank Ausbildungsvergütungen (Stand 01.10.2025) · BA-Entgeltatlas, Automobilkaufmann/-frau · *grobe eigene Schätzung: Steuerklasse I, ohne Kinder, ohne Kirchensteuer");
    s.addNotes(NOTES[6]);
  }

  // =============== 8 PRO CONTRA ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Inhalt dunkel" });
    s.background = { path: path.join(IMG, "s08_bg.jpg") };
    kick(s, "07  ·  ABWÄGUNG"); title(s, "Vor- und Nachteile");
    const cols = [
      ["TbThumbUp", "VORTEILE", "TbCheck", ["Abwechslungsreicher Arbeitsalltag", "Kontakt mit vielen Menschen", "Gute Verdienstmöglichkeiten", "Entwicklungsmöglichkeiten", "Möglichkeit zur Selbstständigkeit"]],
      ["TbThumbDown", "NACHTEILE", "TbX", ["Verkaufsdruck und Zielvorgaben", "Schwierige Kundengespräche", "Starke Konkurrenz", "Wochenendarbeit je nach Betrieb", "Schwankende Einnahmen (selbstständig)"]],
    ];
    const cw = (W - 2 * M - 0.35) / 2;
    for (let c = 0; c < 2; c++) {
      const x = M + c * (cw + 0.35), nm = A("w", "Spalte_" + cols[c][1]);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.95, w: cw, h: 4.6, rectRadius: 0.08, fill: { color: COL.black, transparency: 20 }, line: { color: c ? HEX.red : HEX.line, width: 1 }, objectName: nm });
      await circleIcon(s, x + 0.35, 2.25, 0.62, cols[c][0], { fill: c ? COL.red : COL.white, ic: c ? "#FFFFFF" : "#090A0B", nm });
      T(s, cols[c][1], { x: x + 1.15, y: 2.33, w: 3.5, h: 0.45, fontSize: 22, bold: true, charSpacing: 4, color: c ? COL.red : COL.white, objectName: nm + "_kopf" });
      for (let i = 0; i < 5; i++) {
        const y = 3.2 + i * 0.64, nm2 = A("f", cols[c][1] + (i + 1));
        s.addImage({ data: await icon(cols[c][2], c ? "#E63935" : "#FFFFFF"), x: x + 0.45, y: y + 0.04, w: 0.32, h: 0.32, objectName: nm2 + "_icon" });
        T(s, cols[c][3][i], { x: x + 1.0, y, w: cw - 1.2, h: 0.4, fontSize: 17, valign: "middle", objectName: nm2 });
      }
    }
    s.addNotes(NOTES[7]);
  }

  // =============== 9 ZUKUNFT ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Bild rechts" });
    s.addImage({ path: path.join(IMG, "s09_charge.jpg"), x: W - 5.2, y: 0, w: 5.2, h: 7.5, objectName: A("f", "Bild_Laden"), altText: "Ladestecker an einem Elektroauto" });
    kick(s, "08  ·  ZUKUNFT"); title(s, "Die Zukunft des Autoberufs");
    let nm = A("f", "Stat_Elektro");
    T(s, "19,1 %", { x: M, y: 1.72, w: 3.0, h: 0.95, fontSize: 54, bold: true, color: COL.red, objectName: nm });
    T(s, [{ text: "aller neuen Pkw in Deutschland waren 2025 reine Elektroautos.", options: { breakLine: true } }, { text: "Quelle: Kraftfahrt-Bundesamt (KBA)", options: { fontSize: 10, color: COL.mid } }], { x: M + 3.05, y: 1.85, w: 3.95, h: 0.8, fontSize: 14, color: COL.white, objectName: nm + "_text" });
    const tl = [
      ["TbBolt", "Elektroautos", "Laden & Reichweite"], ["TbDeviceLaptop", "Digitalisierung", "Tablet statt Papierstapel"], ["TbWorld", "Online-Verkauf", "Infos & Kauf im Internet"],
      ["TbRobot", "Künstliche Intelligenz", "Chatbots, Preis-Analysen"], ["TbUsers", "Neue Kundenwünsche", "Leasing, Abo, Carsharing"], ["TbHeartHandshake", "Mensch bleibt", "Vertrauen ist nicht digital"],
    ];
    const tw = 2.2, tg = (7.1 - 3 * tw) / 2, th = 1.38;
    for (let i = 0; i < 6; i++) {
      const x = M + (i % 3) * (tw + tg), y = 2.85 + Math.floor(i / 3) * (th + 0.18); nm = A("f", "Trend" + (i + 1));
      const hi = i === 5;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: tw, h: th, rectRadius: 0.06, fill: { color: hi ? COL.red : COL.anth }, line: { color: hi ? HEX.red : "5A5F64", width: 0.75 }, objectName: nm });
      s.addImage({ data: await icon(tl[i][0], hi ? "#FFFFFF" : "#E63935"), x: x + 0.2, y: y + 0.18, w: 0.36, h: 0.36, objectName: nm + "_icon" });
      T(s, tl[i][1], { x: x + 0.2, y: y + 0.6, w: tw - 0.3, h: 0.46, fontSize: 14, bold: true, valign: "bottom", objectName: nm + "_titel" });
      T(s, tl[i][2], { x: x + 0.2, y: y + 1.07, w: tw - 0.3, h: 0.26, fontSize: 11, color: hi ? COL.white : COL.grey, objectName: nm + "_text" });
    }
    nm = A("w", "Warum_Beratung");
    T(s, [{ text: "Warum persönliche Beratung bleibt: ", options: { bold: true, color: COL.white } }, { text: "Ein Auto kostet oft mehrere Monatsgehälter. Dafür wollen Kunden Vertrauen, eine echte Probefahrt und ehrliche Beratung." }],
      { x: M, y: 5.95, w: 7.1, h: 0.85, fontSize: 14, color: COL.grey, objectName: nm });
    s.addNotes(NOTES[8]);
  }

  // =============== 10 FAZIT ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Abschluss" });
    fullBg(s, "s10_bg.jpg", A("z", "Hintergrundbild"));
    T(s, "09  ·  FAZIT", { x: M, y: 0.62, w: 5, h: 0.3, fontSize: 12, bold: true, color: COL.red, charSpacing: 4, objectName: A("f", "Kicker") });
    s.addText([{ text: "MEHR ALS NUR AUTOS VERKAUFEN" }, { text: ".", options: { color: COL.red } }], { placeholder: "title" });
    T(s, "Ein erfolgreicher Autohändler verbindet:", { x: M, y: 3.35, w: 6.5, h: 0.35, fontSize: 16, color: COL.grey, objectName: A("f", "Kernaussage") });
    const kw = ["Verkaufstalent", "Menschenkenntnis", "Wirtschaftliches Denken", "Interesse an Fahrzeugen"];
    for (let i = 0; i < 4; i++) {
      const y = 3.82 + i * 0.42, nm = A("f", "Begriff" + (i + 1));
      s.addShape(pres.shapes.OVAL, { x: M, y: y + 0.12, w: 0.13, h: 0.13, fill: { color: COL.red }, line: { type: "none" }, objectName: nm + "_punkt" });
      T(s, kw[i], { x: M + 0.3, y, w: 5.5, h: 0.38, fontSize: 19, bold: true, objectName: nm });
    }
    const nm = A("w", "Frage_Klasse");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 5.65, w: 6.6, h: 1.3, rectRadius: 0.08, fill: { color: COL.red }, line: { type: "none" }, objectName: nm });
    T(s, "FRAGE AN DIE KLASSE", { x: M + 0.3, y: 5.8, w: 5, h: 0.25, fontSize: 11, bold: true, charSpacing: 4, objectName: nm + "_label" });
    T(s, "„Würdet ihr euch vorstellen können, später selbstständig einen Autohandel zu führen?“", { x: M + 0.3, y: 6.08, w: 6.1, h: 0.78, fontSize: 18, bold: true, objectName: nm + "_text" });
    s.addNotes(NOTES[9]);
  }

  // =============== 11 QUELLEN ===============
  {
    resetAnim();
    const s = pres.addSlide({ masterName: "Inhalt dunkel" });
    s.addImage({ path: path.join(IMG, "s11_panel.jpg"), x: W - 4.0, y: 0, w: 4.0, h: 7.5, objectName: "Bild_Garage", altText: "Sportwagen in dunkler Garage" });
    kick(s, "10  ·  NACHWEISE"); title(s, "Quellen");
    const q = [
      ["Bundesagentur für Arbeit – BERUFENET: Automobilkaufmann/-frau", "web.arbeitsagentur.de/berufenet"],
      ["Bundesagentur für Arbeit – Entgeltatlas: Automobilkaufmann/-frau", "web.arbeitsagentur.de/entgeltatlas/beruf/6619"],
      ["BIBB – Tarifliche Ausbildungsvergütungen 2025 (Ost/West)", "bibb.de/ausbildungsverguetung"],
      ["Verordnung über die Berufsausbildung zum Automobilkaufmann (AutoKflAusbV)", "gesetze-im-internet.de/autokflausbv"],
      ["IHK – Ausbildungsberuf Automobilkaufmann/-frau", "ihk.de"],
      ["Gewerbeordnung § 14 – Anzeigepflicht (Gewerbeanmeldung)", "gesetze-im-internet.de/gewo/__14.html"],
      ["Kraftfahrt-Bundesamt – Fahrzeugzulassungen, Jahresbilanz 2025", "kba.de"],
      ["Fotos: Unsplash & Pexels (freie Lizenzen) – Details in Quellen.txt", "unsplash.com · pexels.com"],
    ];
    for (let i = 0; i < q.length; i++) {
      const y = 1.9 + i * 0.58;
      T(s, String(i + 1).padStart(2, "0"), { x: M, y, w: 0.5, h: 0.3, fontSize: 13, bold: true, color: COL.red, objectName: "Quelle" + (i + 1) + "_nr" });
      T(s, [{ text: q[i][0], options: { breakLine: true, color: COL.white } }, { text: q[i][1], options: { color: COL.mid, fontSize: 11 } }], { x: M + 0.6, y, w: 8.0, h: 0.52, fontSize: 13, objectName: "Quelle" + (i + 1) });
    }
    T(s, "Alle Links mit Abrufdatum: siehe Datei Quellen.txt", { x: M, y: 6.62, w: 8, h: 0.28, fontSize: 10, italic: true, color: COL.mid, objectName: "Hinweis" });
    s.addNotes(NOTES[10]);
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
}
build().catch(e => { console.error(e); process.exit(1); });
