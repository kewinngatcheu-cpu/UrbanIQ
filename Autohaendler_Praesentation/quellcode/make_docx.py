import json, sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

RED = RGBColor(0xE6, 0x39, 0x35); ANTH = RGBColor(0x15, 0x17, 0x19); GREY = RGBColor(0x6B, 0x70, 0x75)
notes = json.load(open("notes.json", encoding="utf8"))
SLIDE_TITLES = ["Titelfolie", "Was macht ein Autohändler?", "Die wichtigsten Aufgaben", "Welche Fähigkeiten braucht man?",
                "Ausbildung & Einstieg", "Ein typischer Arbeitstag", "Gehalt & Verdienstmöglichkeiten", "Vor- und Nachteile",
                "Die Zukunft des Autoberufs", "Fazit", "Quellen"]
TIPS = [
    "Langsam starten, Blickkontakt zur Klasse. Erst sprechen, wenn alle Elemente eingeblendet sind.",
    "Auf das Bild zeigen: So sieht Beratung im Autohaus aus. Die zwei Karten unten kurz gegenüberstellen.",
    "Mit der Hand die Schritte von links nach rechts nachfahren.",
    "Die rote Karte am Ende betonen – kleine Pause danach.",
    "Die große „3“ als Einstieg nutzen. Den Hinweis zur Selbstständigkeit als Überleitung zum Fazit merken.",
    "Den Hinweis „Beispiel“ unbedingt erwähnen.",
    "Zahlen langsam sprechen. Den Unterschied Brutto/Netto deutlich machen – das interessiert die Klasse.",
    "Abwechselnd sprechen: eine Person die Vorteile, eine Person die Nachteile.",
    "Die 19,1 % als Aufhänger nutzen, dann zur Frage überleiten: Braucht man noch Verkäufer?",
    "Frage stellen und wirklich auf Antworten warten (ca. 10 Sekunden).",
    "Nur bei Nachfragen zeigen.",
]

d = Document()
sec = d.sections[0]
sec.left_margin = sec.right_margin = Cm(2.3); sec.top_margin = sec.bottom_margin = Cm(2.0)
st = d.styles["Normal"]; st.font.name = "Arial"; st.font.size = Pt(11.5)
st.element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
st.paragraph_format.space_after = Pt(7); st.paragraph_format.line_spacing = 1.3
for name, size in (("Heading 1", 20), ("Heading 2", 15)):
    h = d.styles[name]; h.font.name = "Arial"; h.font.size = Pt(size); h.font.bold = True; h.font.color.rgb = ANTH
    h.element.rPr.rFonts.set(qn("w:asciiTheme"), "") if False else None
    rf = h.element.rPr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); h.element.rPr.append(rf)
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(a), "Arial")
    for a in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
        if rf.get(qn(a)) is not None: del rf.attrib[qn(a)]
d.styles["Heading 2"].paragraph_format.space_before = Pt(18)

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); s = OxmlElement("w:shd")
    s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), hexcolor); tcPr.append(s)

# Title
p = d.add_paragraph(); r = p.add_run("BERUFSPRÄSENTATION · KLASSE 10"); r.bold = True; r.font.size = Pt(10); r.font.color.rgb = RED
d.add_heading("Sprechtext: Der Beruf Autohändler", level=1)
p = d.add_paragraph(); r = p.add_run("Mehr als nur Autos verkaufen. – Ausformulierter Vortrag, nach Folien sortiert, mit Zeitangaben")
r.italic = True; r.font.color.rgb = GREY

words = [len(n["text"].split()) for n in notes[:10]]
p = d.add_paragraph()
p.add_run("Gesamtdauer: ").bold = True
p.add_run(f"ca. 10 Minuten · {sum(words)} Wörter bei einem ruhigen Sprechtempo von etwa 125–130 Wörtern pro Minute.")

# overview table
d.add_heading("Zeitplan auf einen Blick", level=2)
t = d.add_table(rows=1, cols=4); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.style = "Table Grid"
hdr = ["Folie", "Thema", "Zeit", "Dauer"]
for i, h in enumerate(hdr):
    c = t.rows[0].cells[i]; c.text = ""; rr = c.paragraphs[0].add_run(h); rr.bold = True; rr.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF); shade(c, "151719")
def secs(a):
    m, s = a.split(":"); return int(m) * 60 + int(s)
for i, n in enumerate(notes[:10]):
    row = t.add_row().cells
    dur = secs(n["end"]) - secs(n["start"])
    vals = [str(i + 1), SLIDE_TITLES[i], f'{n["start"]} – {n["end"]}', f"{dur} Sek."]
    for j, v in enumerate(vals):
        row[j].text = v
row = t.add_row().cells
for j, v in enumerate(["11", "Quellen", "bei Nachfragen", "–"]): row[j].text = v
t.autofit = False
WS = (Cm(1.5), Cm(8.0), Cm(4.0), Cm(2.4))
for j, w in enumerate(WS): t.columns[j].width = w
for r_ in t.rows:
    for j, w in enumerate(WS): r_.cells[j].width = w

p = d.add_paragraph(); p.paragraph_format.space_before = Pt(10)
r = p.add_run("Tipp: "); r.bold = True; r.font.color.rgb = RED
p.add_run("Den Text nicht wörtlich ablesen. Lest ihn mehrmals laut, markiert euch Schlüsselwörter und sprecht dann frei. Die Folien zeigen nur die wichtigsten Stichworte – ihr erklärt den Rest. Teilt die Folien vorher untereinander auf (z. B. Person A: Folien 1–5, Person B: Folien 6–10).")

for i, n in enumerate(notes):
    d.add_heading(f"Folie {i + 1} – {SLIDE_TITLES[i]}", level=2)
    p = d.add_paragraph(); r = p.add_run(f'⏱  {n["start"]}' + (f' – {n["end"]}' if n["end"] else ""))
    r.bold = True; r.font.color.rgb = RED; r.font.size = Pt(10.5)
    if i < 10:
        p.add_run(f"   ·   ca. {secs(n['end']) - secs(n['start'])} Sekunden").font.color.rgb = GREY
    for para in n["text"].split("\n\n"):
        d.add_paragraph(para)
    p = d.add_paragraph(); r = p.add_run("Vortragshinweis: "); r.bold = True; r.font.size = Pt(10); r.font.color.rgb = GREY
    r2 = p.add_run(TIPS[i]); r2.italic = True; r2.font.size = Pt(10); r2.font.color.rgb = GREY

d.add_page_break()
d.add_heading("Anhang: Animationen und Canva-Import", level=2)
for txt in [
    "In der PowerPoint-Datei sind bereits Folienübergänge (Verblassen; Titel- und Fazitfolie „durch Schwarz“) und Animationen enthalten. Die Elemente jeder Folie werden nach dem Folienwechsel automatisch nacheinander eingeblendet (Verblassen bzw. Wischen von links). Auf der Titel- und Fazitfolie zoomt das Hintergrundbild langsam heran. Ihr müsst also nur einmal pro Folie klicken.",
    "Optional in PowerPoint: Wer einen Morph-Effekt möchte, kann bei Folie 2 bis 9 unter „Übergänge“ → „Morphen“ wählen. Weil Titel und Folienaufbau gleich positioniert sind, wirkt der Wechsel dann besonders flüssig.",
    "Canva übernimmt beim Import von PowerPoint-Dateien Texte, Bilder und Formen als einzeln bearbeitbare Elemente, aber keine PowerPoint-Animationen. Empfehlung für Canva nach dem Import:",
]:
    d.add_paragraph(txt)
for b in [
    "Folie 1 und 10: Seitenanimation „Verblassen“ oder „Aufsteigen“; Hintergrundbild mit „Zoom“ (langsam).",
    "Folie 2, 4, 9: Icons und Karten mit „Verblassen“, Option „Elemente nacheinander“.",
    "Folie 3 und 6: Prozess bzw. Zeitstrahl mit „Wischen“ (von links nach rechts).",
    "Folie 5 und 7: Große Zahlen (3 Jahre, 4.238 €, Diagramm) mit „Aufsteigen“ oder „Verblassen“.",
    "Folie 8: Erst die Spalte „Vorteile“, dann „Nachteile“ einblenden.",
    "Folienübergang in Canva: überall „Auflösen“ (dezent). Keine Dreh- oder Sprungeffekte.",
    "Schriftart: Arial (in Canva vorhanden). Farben: #090A0B, #151719, #FFFFFF, #E63935, #BFC3C7.",
]:
    d.add_paragraph(b, style="List Bullet")
d.add_paragraph("Hinweis: Nach dem Import in Canva die Folie 7 prüfen – das Säulendiagramm wird je nach Canva-Version als bearbeitbares Diagramm oder als Grafik übernommen. Falls nötig, mit „Diagramme“ in Canva neu anlegen (Werte: 1.103 €, 1.149 €, 1.225 €).")
d.save(sys.argv[1])
print("ok", sum(words))
