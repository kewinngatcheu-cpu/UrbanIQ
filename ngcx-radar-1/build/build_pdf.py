"""Baut den zweiseitigen PDF-Begleiter (A4 hoch, ausfüllbare Felder ohne JavaScript)."""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

OUT = sys.argv[1]
FD = "/usr/share/fonts/truetype/liberation/"
# Liberation Sans: metrisch identisch zu Arial (Arial selbst ist in der Build-Umgebung nicht verfügbar)
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))

BLACK, BLUE, LBLUE, SILVER = HexColor("#0B0C0F"), HexColor("#2F6BFF"), HexColor("#5AAAFF"), HexColor("#969CA5")
TEXT, MUTED, LINE, TINT = HexColor("#1A1C21"), HexColor("#5B616B"), HexColor("#E3E6EB"), HexColor("#F2F6FF")
GREEN, YELLOW, RED, INPUT = HexColor("#1E9E5A"), HexColor("#F2B705"), HexColor("#E5484D"), HexColor("#FFF2B3")
W, H = A4
M = 48            # Seitenrand
CW = W - 2 * M    # Inhaltsbreite

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("NGCX Radar #1 – Scope-Verlust-Rechner")
c.setAuthor("NGCX Intelligence")
c.setSubject("Begleiter zum Scope-Verlust-Rechner")

def txt(x, y, s, font="Arial", size=10, color=TEXT, align="left"):
    c.setFont(font, size); c.setFillColor(color)
    {"left": c.drawString, "right": c.drawRightString, "center": c.drawCentredString}[align](x, y, s)

def para(x, y, s, width, font="Arial", size=10, color=TEXT, leading=None):
    leading = leading or size * 1.4
    lines = simpleSplit(s, font, size, width)
    for i, line in enumerate(lines):
        txt(x, y - i * leading, line, font, size, color)
    return y - len(lines) * leading

def rect(x, y, w, h, fill, stroke=None):
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke); c.setLineWidth(0.6)
    c.rect(x, y, w, h, fill=1, stroke=1 if stroke else 0)

def hline(x1, x2, y, color=LINE, w=0.6):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def header(subtitle, page):
    rect(0, H - 118, W, 118, BLACK)
    txt(M, H - 38, "NGCX INTELLIGENCE  ·  RADAR #1", "Arial-Bold", 8.5, LBLUE)
    txt(W - M, H - 38, "Know. Decide. Grow.", "Arial", 8.5, SILVER, "right")
    txt(M, H - 72, "Was kosten euch Zusatzwünsche", "Arial-Bold", 21, white)
    txt(M, H - 97, "und Abstimmung im Jahr?", "Arial-Bold", 21, white)
    txt(W - M, H - 97, subtitle, "Arial", 8.5, SILVER, "right")

def section(y, num, title, note=None):
    txt(M, y, num, "Arial-Bold", 12, BLUE)
    txt(M + 24, y, title, "Arial-Bold", 12, BLACK)
    if note:
        txt(W - M, y, note, "Arial", 7.5, SILVER, "right")
    hline(M, W - M, y - 8, BLACK, 1.2)
    return y - 8

def footer(page):
    hline(M, W - M, 34, LINE)
    txt(M, 22, "NGCX INTELLIGENCE  ·  RADAR #1  ·  SCOPE-VERLUST-RECHNER", "Arial-Bold", 6.5, SILVER)
    txt(W - M, 22, f"Seite {page} von 2", "Arial", 6.5, SILVER, "right")

# ============================================================== SEITE 1
header("Scope-Verlust-Rechner  ·  Das Problem verstehen", 1)
y = H - 150
y = para(M, y, "Zusatzwünsche wirken oft klein. Ein weiteres Meeting, eine kurzfristige Anpassung oder eine zusätzliche "
         "Korrekturschleife. Doch wenn solche Tätigkeiten bei mehreren Projekten regelmäßig nicht abgerechnet werden, entsteht "
         "ein wirtschaftlicher Verlust, der im Tagesgeschäft häufig unsichtbar bleibt.", CW, "Arial", 10.5, TEXT, 15.5)

# --- 01 Beispielwerte
y -= 18
y = section(y, "01", "Die Beispielwerte", "Realistische Annahmen für eine Agentur mit 10–50 Mitarbeitenden")
vals = [("Projekte pro Jahr", "20"), ("Ø Projektvolumen", "30.000 €"), ("Ø Stundensatz", "100 €"),
        ("Zusatzwünsche / Projekt", "15 Std."), ("Abstimmung / Projekt", "10 Std."), ("Nacharbeit / Projekt", "8 Std.")]
bw, bh, gap = (CW - 2 * 8) / 3, 38, 8
y -= 10
for i, (lab, v) in enumerate(vals):
    col, row = i % 3, i // 3
    x, yy = M + col * (bw + gap), y - (row + 1) * bh - row * 6
    rect(x, yy, bw, bh, HexColor("#F7F8FA"))
    txt(x + 10, yy + bh - 14, lab.upper(), "Arial-Bold", 6.5, SILVER)
    txt(x + 10, yy + 9, v, "Arial-Bold", 13, BLACK)
y -= 2 * bh + 6

# --- 02 Rechenweg
y -= 24
y = section(y, "02", "Der Rechenweg")
steps = [
    ("1", "Unbezahlte Stunden pro Projekt", "Zusatzwünsche + Abstimmung + Nacharbeit", "15 + 10 + 8", "33 Std."),
    ("2", "Verlust pro Projekt", "Unbezahlte Stunden × Stundensatz", "33 Std. × 100 €", "3.300 €"),
    ("3", "Verlustanteil am Projektvolumen", "Verlust pro Projekt ÷ Projektvolumen × 100", "3.300 € ÷ 30.000 €", "11,0 %"),
    ("4", "Geschätzter Verlust pro Jahr", "Verlust pro Projekt × Projekte pro Jahr", "3.300 € × 20", "66.000 €"),
    ("5", "Verlorene Projektäquivalente", "Verlust pro Jahr ÷ Projektvolumen", "66.000 € ÷ 30.000 €", "2,2"),
]
rh = 27
y -= 4
for n, lab, formula, calc, res in steps:
    key = n == "4"
    yy = y - rh
    if key:
        rect(M, yy, CW, rh, TINT)
    txt(M + 8, yy + 15, n, "Arial-Bold", 9, BLUE if key else SILVER)
    txt(M + 24, yy + 15.5, lab, "Arial-Bold", 9.5, BLACK)
    txt(M + 24, yy + 5.5, formula, "Arial", 7.5, MUTED)
    txt(M + 330, yy + 11, calc, "Arial", 9, MUTED)
    txt(W - M - 8, yy + 10.5, res, "Arial-Bold", 11, BLUE if key else BLACK, "right")
    hline(M, W - M, yy, LINE)
    y = yy

# --- Hauptergebnis
y -= 18
hb = 96
rect(M, y - hb, CW, hb, TINT)
rect(M, y - hb, 3, hb, BLUE)
txt(M + 18, y - 20, "GESCHÄTZTER JÄHRLICHER VERLUST", "Arial-Bold", 7.5, BLUE)
txt(M + 18, y - 58, "66.000 €", "Arial-Bold", 38, BLUE)
txt(M + 18, y - 78, "jährlicher Verlust im Beispiel", "Arial", 9, MUTED)
x2 = M + 268
c.setStrokeColor(HexColor("#D5DEF5")); c.setLineWidth(0.8); c.line(x2 - 16, y - 14, x2 - 16, y - hb + 14)
txt(x2, y - 20, "ENTSPRICHT RECHNERISCH", "Arial-Bold", 7.5, BLUE)
txt(x2, y - 50, "2,2", "Arial-Bold", 26, BLACK)
txt(x2 + 46, y - 50, "durchschnittlichen Projektvolumen", "Arial-Bold", 9.5, BLACK)
# Mini-Balken: 66.000 vs. 30.000
bx, bwmax = x2, CW - (x2 - M) - 18
rect(bx, y - 68, bwmax, 8, BLUE)
rect(bx, y - 80, bwmax * 30000 / 66000, 8, HexColor("#C9CDD3"))
txt(bx + bwmax, y - 89, "Verlust pro Jahr (blau) vs. Ø Projektvolumen (grau)", "Arial", 6.5, MUTED, "right")
y -= hb
y = para(M, y - 14, "Ihr verliert rechnerisch den Gegenwert von 2,2 durchschnittlichen Projekten pro Jahr. Das ist ein rechnerisches "
         "Projektäquivalent – keine tatsächlich verlorenen Aufträge.", CW, "Arial", 8.5, MUTED, 12)

# --- 03 Ampel
y -= 14
y = section(y, "03", "Die Ampel-Bewertung", "Bezug: Verlustanteil am Projektvolumen")
y -= 14
sw = (CW - 2 * 6) / 3
amp = [("GRÜN", "unter 5 %", GREEN, False), ("GELB", "ab 5 % bis einschließlich 10 %", YELLOW, False), ("ROT", "über 10 %", RED, True)]
for i, (lab, rng, col, active) in enumerate(amp):
    x = M + i * (sw + 6)
    if active:
        rect(x, y - 34, sw, 34, col)
        txt(x + 10, y - 15, lab + "  ·  Beispiel: 11,0 %", "Arial-Bold", 9.5, white)
        txt(x + 10, y - 27, rng, "Arial", 8, white)
    else:
        rect(x, y - 34, sw, 34, HexColor("#F3F4F6"))
        rect(x, y - 34, 3, 34, col)
        txt(x + 12, y - 15, lab, "Arial-Bold", 9.5, MUTED)
        txt(x + 12, y - 27, rng, "Arial", 8, MUTED)
y -= 34
y = para(M, y - 14, "Mit einem Verlustanteil von 11,0 % liegt das Beispiel im roten Bereich: Mehr als jeder zehnte Euro des "
         "Projektvolumens wird als Arbeit erbracht, aber nicht abgerechnet.", CW, "Arial", 9, TEXT, 12.5)
y = para(M, y - 2, "NGCX-Orientierung – keine Studienwerte, Branchenbenchmarks oder wissenschaftlich validierten Grenzwerte.",
         CW, "Arial-Italic", 8, SILVER, 11)

# --- Hinweis Excel
y -= 12
rect(M, y - 30, CW, 30, BLACK)
txt(M + 14, y - 19, "Die Excel-Version rechnet automatisch. Passe dort einfach die sechs Werte an eure Situation an.",
    "Arial-Bold", 9, white)
txt(W - M - 14, y - 19, "→", "Arial-Bold", 11, LBLUE, "right")
footer(1)
c.showPage()

# ============================================================== SEITE 2
rect(0, H - 92, W, 92, BLACK)
txt(M, H - 36, "NGCX INTELLIGENCE  ·  RADAR #1", "Arial-Bold", 8.5, LBLUE)
txt(W - M, H - 36, "Know. Decide. Grow.", "Arial", 8.5, SILVER, "right")
txt(M, H - 66, "Euer Arbeitsblatt", "Arial-Bold", 21, white)
txt(W - M, H - 66, "Werte eintragen, Schritt für Schritt rechnen", "Arial", 8.5, SILVER, "right")

form = c.acroForm
def field(name, x, y, w, h, tip, fill=INPUT, border=None):
    form.textfield(name=name, tooltip=tip, x=x, y=y, width=w, height=h, fontName="Helvetica-Bold", fontSize=10,
                   borderWidth=0.8 if border else 0, borderColor=border or fill, fillColor=fill, textColor=BLUE,
                   forceBorder=bool(border), borderStyle="solid", fieldFlags="", maxlen=20)
    if not border:
        hline(x, x + w, y, HexColor("#E6D27A"), 0.8)

y = H - 122
y = section(y, "01", "Eure Werte", "Gelbe Felder sind am Bildschirm ausfüllbar oder per Hand")
y -= 4
ins = [
    ("A", "Projekte pro Jahr", "Anzahl", "Kundenprojekte, die ihr in einem typischen Jahr umsetzt."),
    ("B", "Ø Projektvolumen", "€", "Typischer Netto-Auftragswert eines Projekts."),
    ("C", "Ø Stundensatz", "€ / Std.", "Euer üblicher Netto-Stundensatz gegenüber Kunden."),
    ("D", "Nicht abgerechnete Zusatzwünsche", "Std. / Projekt", "Extras und Änderungen, die ohne Berechnung umgesetzt wurden."),
    ("E", "Nicht abrechenbare Abstimmung", "Std. / Projekt", "Zusätzliche Meetings, Calls und E-Mails, die keiner bezahlt."),
    ("F", "Nacharbeit nach Abnahme", "Std. / Projekt", "Korrekturen nach dem offiziellen Projektabschluss."),
]
rh = 26
fx, fw = M + 318, 84
for k, lab, unit, expl in ins:
    yy = y - rh
    rect(M, yy + 5, 16, 16, BLACK)
    txt(M + 8, yy + 9.5, k, "Arial-Bold", 8.5, white, "center")
    txt(M + 26, yy + 15, lab, "Arial-Bold", 9.5, BLACK)
    txt(M + 26, yy + 5, expl, "Arial", 7.5, MUTED)
    field(f"Eingabe_{k}", fx, yy + 4, fw, 18, f"{lab} ({unit})")
    txt(fx + fw + 8, yy + 9.5, unit, "Arial", 8, MUTED)
    hline(M, W - M, yy, LINE)
    y = yy

y -= 20
y = section(y, "02", "Eure Rechnung", "Formel mit den Buchstaben aus 01")
y -= 4
calc = [
    ("1", "Unbezahlte Stunden pro Projekt", "D + E + F", "Std."),
    ("2", "Verlust pro Projekt", "Ergebnis 1 × C", "€"),
    ("3", "Verlustanteil am Projektvolumen", "Ergebnis 2 ÷ B × 100", "%"),
    ("4", "Geschätzter Verlust pro Jahr", "Ergebnis 2 × A", "€"),
    ("5", "Verlorene Projektäquivalente", "Ergebnis 4 ÷ B", "Projekte"),
    ("+", "Hebel-Szenario (½ Zusatzwünsche)", "D × 50 % × C × A", "€ / Jahr"),
]
rh = 22
for n, lab, f, unit in calc:
    key = n == "4"
    yy = y - rh
    if key:
        rect(M, yy, CW, rh, TINT)
    txt(M + 8, yy + 7.5, n, "Arial-Bold", 9, BLUE if n in "4+" else SILVER, "center")
    txt(M + 26, yy + 7.5, lab, "Arial-Bold", 9.5, BLACK)
    txt(M + 205, yy + 7.5, f, "Arial", 8.5, MUTED)
    field(f"Ergebnis_{n if n != '+' else 'Hebel'}", fx, yy + 3, fw, 16, lab, white, HexColor("#C9CDD3"))
    txt(fx + fw + 8, yy + 7.5, unit, "Arial", 8, MUTED)
    hline(M, W - M, yy, LINE)
    y = yy
y = para(M, y - 13, "Ampel (Ergebnis 3):  unter 5 % Grün  ·  5 bis 10 % Gelb  ·  über 10 % Rot.  "
         "NGCX-Orientierung – keine Studienwerte, Branchenbenchmarks oder wissenschaftlich validierten Grenzwerte.",
         CW, "Arial", 7.5, MUTED, 10.5)

# --- 03 Teaser (dunkel)
TEASER_P = ("Wir machen wirtschaftliche Zusammenhänge in IT- und Softwareprojekten transparenter und helfen Unternehmen, "
            "bessere Entscheidungen auf Basis ihrer Projektdaten zu treffen.")
need = 26 + 26 + 18 + 4 * 15.5 + 24 + 15 + len(simpleSplit(TEASER_P, "Arial", 9, CW - 44)) * 12.5 + 12 + 15 + 22
BOX_BOTTOM = 86
top = BOX_BOTTOM + need
assert y - 12 > top, f"Seite 2 zu voll: Inhalt endet bei {y}, Teaser braucht bis {top}"
rect(M, BOX_BOTTOM, CW, need, BLACK)
x = M + 22
yy = top - 26
txt(x, yy, "03", "Arial-Bold", 11, LBLUE); txt(x + 22, yy, "Was dieser Rechner nicht zeigt", "Arial-Bold", 11, white)
yy -= 26
txt(x, yy, "Ihr kennt jetzt die Größenordnung.", "Arial-Bold", 13, white)
yy -= 18
txt(x, yy, "Offen bleibt:", "Arial", 9.5, SILVER)
for q in ["In welchen Projekten genau geht das Geld verloren?",
          "Bei welchen Kunden häuft sich der zusätzliche Aufwand?",
          "Welche Leistungen werden regelmäßig nicht abgerechnet?",
          "Woran erkennt man frühzeitig, dass ein laufendes Projekt wirtschaftlich aus dem Ruder läuft?"]:
    yy -= 15.5
    txt(x, yy, "—", "Arial-Bold", 9.5, LBLUE)
    txt(x + 18, yy, q, "Arial", 9.5, white)
yy -= 24
txt(x, yy, "Genau hier setzt NGCX Intelligence an.", "Arial-Bold", 10.5, white)
yy = para(x, yy - 15, TEASER_P, CW - 44, "Arial", 9, HexColor("#C9CDD3"), 12.5)
yy -= 12
txt(x, yy, "Ihr möchtet wissen, wo eure konkreten Verluste entstehen?", "Arial-Bold", 10.5, LBLUE)
txt(x, yy - 15, "Antworte einfach auf die E-Mail, mit der du diesen Rechner erhalten hast.", "Arial", 9.5, white)
BOTTOM_TEXT = yy - 15
para(M, 68, "Deine Eingaben bleiben in dieser Datei. Es werden keine Daten übertragen. Alle Werte basieren auf eigenen Schätzungen. "
     "Das Ergebnis dient ausschließlich der Orientierung und stellt keine betriebswirtschaftliche Beratung dar.",
     CW, "Arial", 7, SILVER, 9.5)
footer(2)
c.save()
print("saved", OUT, "| Teaser-Text endet bei", round(BOTTOM_TEXT), "Box-Unterkante", BOX_BOTTOM, "| Abstand oben", round(y - top))
