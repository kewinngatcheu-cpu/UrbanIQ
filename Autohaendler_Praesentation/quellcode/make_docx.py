import json, sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

RED = RGBColor(0xE6, 0x39, 0x35); ANTH = RGBColor(0x15, 0x17, 0x19); GREY = RGBColor(0x6B, 0x70, 0x75)
notes = json.load(open(sys.argv[2] if len(sys.argv) > 2 else "notes.json", encoding="utf8"))
SLIDE_TITLES = ["Titelfolie", "Was macht ein Autohändler?", "Die wichtigsten Aufgaben", "Welche Fähigkeiten braucht man?",
                "Ausbildung & Einstieg", "Ein typischer Arbeitstag", "Gehalt & Verdienstmöglichkeiten", "Vor- und Nachteile",
                "Die Zukunft des Autoberufs", "Fazit", "Quellen"]
TIPS = [
    "Langsam starten und Blickkontakt zur Klasse halten.",
    "Die zwei Kästen unten (selbstständig/angestellt) kurz vergleichen.",
    "Mit der Hand die Schritte von links nach rechts nachfahren.",
    "Den Satz im roten Kasten betonen und kurz Pause machen.",
    "Den Kasten „Ohne Ausbildung selbstständig?“ nicht vergessen.",
    "Den Hinweis „Beispiel“ unbedingt erwähnen.",
    "Zahlen langsam sprechen. Den Unterschied zwischen Brutto und Netto deutlich machen.",
    "Abwechselnd sprechen: eine Person die Vorteile, eine Person die Nachteile.",
    "Auf die 19,1 % zeigen und dann zur Frage überleiten, ob man noch Verkäufer braucht.",
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
p = d.add_paragraph(); r = p.add_run("Ausformulierter Vortrag, nach Folien sortiert, mit Zeitangaben")
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
d.add_heading("Anhang: So kommt die Präsentation in Canva", level=2)
for b in [
    "Canva öffnen und oben auf „Hochladen“ bzw. „Importieren“ klicken (oder die Datei einfach in Canva hineinziehen).",
    "Die Datei Autohändler_Berufspraesentation_Canva.pptx auswählen. Canva wandelt sie automatisch in eine Präsentation um.",
    "Alle Texte, Kästen und Bilder sind danach einzeln bearbeitbar. Auf Folie 1 eure Namen eintragen.",
    "Der Sprechtext steht bei jeder Folie unten in den Notizen.",
    "Animationen (optional): Folie anklicken, oben „Animieren“ wählen, z. B. „Verblassen“ oder „Aufsteigen“. Lieber dezent bleiben.",
]:
    d.add_paragraph(b, style="List Number")
d.save(sys.argv[1])
print("ok", sum(words))
