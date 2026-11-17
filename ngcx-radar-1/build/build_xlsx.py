"""Baut NGCX_Radar_1_Scope-Verlust-Rechner.xlsx (alle Ergebnisse als echte Formeln)."""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.chart.marker import DataPoint
from openpyxl.drawing.line import LineProperties
from openpyxl.worksheet.page import PageMargins

OUT = sys.argv[1]

BLACK, WHITE, BLUE, LBLUE, SILVER = "0B0C0F", "FFFFFF", "2F6BFF", "5AAAFF", "969CA5"
INPUT_FILL, TINT, LINE, TEXT = "FFF2B3", "F2F6FF", "E3E6EB", "1A1C21"
GREEN, YELLOW, RED, NEUTRAL = "1E9E5A", "F2B705", "E5484D", "EEF0F3"
F = "Arial"

def font(size=10, bold=False, color=TEXT, italic=False):
    return Font(name=F, size=size, bold=bold, color=color, italic=italic)

def fill(c):
    return PatternFill("solid", start_color=c, end_color=c)

wb = Workbook()
wb._named_styles["Normal"].font = Font(name=F, size=10)

ws = wb.active
ws.title = "Radar"
ws2 = wb.create_sheet("So funktioniert’s")
S2 = "'So funktioniert’s'"

# ---------------------------------------------------------------- Raster
widths = {"A": 2.5, "B": 5, "C": 37, "D": 19, "E": 13, "F": 2.5, "G": 36, "H": 2.5}
for k, v in widths.items():
    ws.column_dimensions[k].width = v
ws.sheet_view.showGridLines = False
ws.sheet_view.zoomScale = 100

def put(cell, value=None, f=None, al=None, fl=None, nf=None, merge=None):
    c = ws[cell]
    if value is not None:
        c.value = value
    c.font = f or font()
    c.alignment = al or Alignment(vertical="center")
    if fl:
        c.fill = fill(fl)
    if nf:
        c.number_format = nf
    if merge:
        ws.merge_cells(f"{cell}:{merge}")
    return c

def band(row, color, cols="ABCDEFGH"):
    for col in cols:
        ws[f"{col}{row}"].fill = fill(color)

def h(row, pts):
    ws.row_dimensions[row].height = pts

L = Alignment(horizontal="left", vertical="center", wrap_text=True)
LT = Alignment(horizontal="left", vertical="top", wrap_text=True)
R = Alignment(horizontal="right", vertical="center")
C = Alignment(horizontal="center", vertical="center")

# ---------------------------------------------------------------- Kopf
for r, pts in [(1, 10), (2, 18), (3, 34), (4, 18), (5, 12)]:
    band(r, BLACK); h(r, pts)
put("B2", "NGCX INTELLIGENCE  ·  RADAR #1", font(9, True, LBLUE), merge="E2")
put("G2", "Know. Decide. Grow.", font(9, False, SILVER), R)
put("B3", "Was kosten euch Zusatzwünsche und Abstimmung im Jahr?", font(19, True, WHITE), merge="G3")
put("B4", "Scope-Verlust-Rechner  ·  Sechs eigene Schätzwerte eintragen, das Ergebnis rechnet sich automatisch.",
    font(9, False, SILVER), merge="G4")
h(6, 16)

def section(row, num, title, hint=None):
    h(row, 24)
    put(f"B{row}", num, font(14, True, BLUE))
    put(f"C{row}", title, font(14, True, BLACK), merge=f"E{row}")
    if hint:
        put(f"G{row}", hint, font(8, False, SILVER), R)
    h(row + 1, 6)
    for col in "BCDEFG":
        ws[f"{col}{row+1}"].border = Border(top=Side(style="medium", color=BLACK))

# ---------------------------------------------------------------- 01 Eingaben
section(7, "01", "Eure Werte", "Gelbe Felder anpassen – der Rest rechnet automatisch.")
h(9, 18)
hdr = font(7.5, True, SILVER)
put("C9", "EINGABE", hdr); put("D9", "WERT", hdr, R); put("E9", "EINHEIT", hdr, Alignment(horizontal="left", vertical="center", indent=1))
put("G9", "WAS ZÄHLT DAZU?", hdr)

inputs = [
    ("Projekte pro Jahr", 20, "Anzahl", "#,##0",
     "Wie viele Kundenprojekte schließt ihr in einem typischen Jahr ab?",
     "Anzahl der Kundenprojekte, die ihr in einem typischen Jahr umsetzt. Bitte als ganze Zahl eintragen."),
    ("Durchschnittliches Projektvolumen", 30000, "€", "#,##0",
     "Typischer Auftragswert eines Projekts (netto).",
     "Typischer Netto-Auftragswert eines Projekts laut Angebot bzw. Rechnung."),
    ("Durchschnittlicher Stundensatz", 100, "€ / Std.", "#,##0",
     "Euer üblicher Stundensatz gegenüber Kunden (netto).",
     "Der Netto-Stundensatz, den ihr Kunden üblicherweise berechnet."),
    ("Nicht abgerechnete Zusatzwünsche", 15, "Std. / Projekt", "General",
     "Kleine Extras und Änderungen, die ihr „mal eben“ umsetzt, ohne sie zu berechnen.",
     "Stunden pro Projekt für Zusatzwünsche und Änderungen, die nicht im Angebot standen und nicht berechnet wurden."),
    ("Nicht abrechenbare Abstimmung", 10, "Std. / Projekt", "General",
     "Zusätzliche Meetings, Calls und E-Mails, die über das Angebot hinausgehen.",
     "Stunden pro Projekt für zusätzliche Meetings, Calls und E-Mails, die der Kunde nicht bezahlt."),
    ("Nacharbeit nach Abnahme", 8, "Std. / Projekt", "General",
     "Korrekturen und Anpassungen nach dem offiziellen Projektabschluss.",
     "Stunden pro Projekt für Korrekturen und Anpassungen nach der Abnahme, die nicht mehr berechnet werden."),
]
IN = {}
for i, (label, val, unit, nf, help_, prompt) in enumerate(inputs):
    r = 10 + i
    h(r, 30)
    put(f"C{r}", label, font(10, True, BLACK), L)
    c = put(f"D{r}", val, Font(name=F, size=11, bold=True, color=BLUE), R, INPUT_FILL, nf)
    c.protection = Protection(locked=False)
    c.border = Border(bottom=Side(style="thin", color="E6D27A"))
    put(f"E{r}", unit, font(8.5, False, SILVER), Alignment(horizontal="left", vertical="center", indent=1, wrap_text=True))
    put(f"G{r}", help_, font(8.5, False, "5B616B"), L)
    for col in "BCDEFG":
        cc = ws[f"{col}{r}"]
        if col != "D":
            cc.border = Border(bottom=Side(style="hair", color=LINE))
    IN[i] = f"$D${r}"

P, V, RATE, X, A, N = (f"MAX(0,N({IN[i]}))" for i in range(6))

# Datenüberprüfung + Eingabemeldungen
for i, (label, _, _, _, _, prompt) in enumerate(inputs):
    cell = IN[i].replace("$", "")
    if i == 0:
        dv = DataValidation(type="whole", operator="between", formula1="0", formula2="1000", allow_blank=True)
        err = "Bitte eine ganze Zahl zwischen 0 und 1.000 eintragen."
    elif i == 1:
        dv = DataValidation(type="decimal", operator="between", formula1="0", formula2="10000000", allow_blank=True)
        err = "Bitte eine Zahl ab 0 eintragen (maximal 10.000.000)."
    elif i == 2:
        dv = DataValidation(type="decimal", operator="between", formula1="0", formula2="1000", allow_blank=True)
        err = "Bitte eine Zahl ab 0 eintragen (maximal 1.000)."
    else:
        dv = DataValidation(type="decimal", operator="between", formula1="0", formula2="10000", allow_blank=True)
        err = "Bitte eine Zahl ab 0 eintragen (maximal 10.000)."
    dv.promptTitle = label[:32]
    dv.prompt = prompt
    dv.showInputMessage = True
    dv.errorTitle = "Ungültige Eingabe"
    dv.error = err
    dv.errorStyle = "stop"
    dv.showErrorMessage = True
    ws.add_data_validation(dv)
    dv.add(cell)

# ---------------------------------------------------------------- 02 Ergebnis
h(16, 18)
section(17, "02", "Euer Ergebnis", "Berechnet aus euren sechs Werten.")
h(19, 10)

# Kennzahlen (Rechenweg) – Zeilen 30-34, werden oben referenziert
HRS, LPP, SHR, YR, EQ = "$D$30", "$D$31", "$D$32", "$D$33", "$D$34"

# Hero
for r, pts in [(20, 20), (21, 46), (22, 34)]:
    h(r, pts)
    for col in "BCDE":
        ws[f"{col}{r}"].fill = fill(TINT)
    ws[f"B{r}"].border = Border(left=Side(style="thick", color=BLUE))
put("B20", "GESCHÄTZTER VERLUST PRO JAHR", font(8, True, BLUE), Alignment(horizontal="left", vertical="bottom", indent=1), TINT, merge="E20")
put("B21", f"={YR}", Font(name=F, size=30, bold=True, color=BLUE), Alignment(horizontal="left", vertical="center", indent=1),
    TINT, '#,##0" €"', merge="E21")
put("B22", f'=IF(ISNUMBER({EQ}),"Ihr verliert rechnerisch den Gegenwert von "&FIXED({EQ},1)&" durchschnittlichen Projekten pro Jahr.","Tragt ein Projektvolumen ein, um die Projektäquivalente zu berechnen.")',
    font(10, True, BLACK), Alignment(horizontal="left", vertical="top", wrap_text=True, indent=1), TINT, merge="E22")
ws["B20"].border = ws["B21"].border = ws["B22"].border = Border(left=Side(style="thick", color=BLUE))
h(23, 10)

# Ampel
h(24, 16); h(25, 30); h(26, 26)
put("B24", "AMPEL-BEWERTUNG   ·   unter 5 % Grün   ·   5 bis 10 % Gelb   ·   über 10 % Rot", font(7.5, True, SILVER), merge="E24")
AMP = "$D$25"
put("B25", f'=IF(ISNUMBER({SHR}),"Verlustanteil am Projektvolumen: "&FIXED({SHR}*100,1)&" %","Ohne Projektvolumen ist keine Bewertung möglich.")',
    font(10, True, BLACK), L, merge="C25")
put("D25", f'=IF(ISNUMBER({SHR}),IF(ROUND({SHR},6)<0.05,"GRÜN",IF(ROUND({SHR},6)<=0.1,"GELB","ROT")),"–")',
    font(11, True, SILVER), C, NEUTRAL, merge="E25")
put("B26", "NGCX-Orientierung – keine Studienwerte, Branchenbenchmarks oder wissenschaftlich validierten Grenzwerte.",
    font(8, False, SILVER, italic=True), LT, merge="E26")
for txt, bg, fg in [("GRÜN", GREEN, WHITE), ("GELB", YELLOW, BLACK), ("ROT", RED, WHITE)]:
    ws.conditional_formatting.add("D25:E25", FormulaRule(formula=[f'{AMP}="{txt}"'], stopIfTrue=True,
        fill=fill(bg), font=Font(name=F, bold=True, color=fg)))

h(27, 12)
# Rechenweg
h(28, 18)
put("B28", "RECHENWEG IM DETAIL", font(7.5, True, SILVER), merge="C28")
put("D28", "ERGEBNIS", font(7.5, True, SILVER), R)
put("G28", "BERECHNUNG", font(7.5, True, SILVER))
for col in "BCDEFG":
    ws[f"{col}28"].border = Border(bottom=Side(style="thin", color=LINE))
h(29, 2)
kpis = [
    ("1", "Unbezahlte Stunden pro Projekt", f"={X}+{A}+{N}", '#,##0" h"', "Zusatzwünsche + Abstimmung + Nacharbeit"),
    ("2", "Verlust pro Projekt", f"={HRS}*{RATE}", '#,##0" €"', "Unbezahlte Stunden × Stundensatz"),
    ("3", "Verlustanteil am Projektvolumen", f'=IF({V}=0,"–",{LPP}/{V})', '#,##0.0 %', "Verlust pro Projekt ÷ Projektvolumen"),
    ("4", "Geschätzter Verlust pro Jahr", f"={LPP}*{P}", '#,##0" €"', "Verlust pro Projekt × Projekte pro Jahr"),
    ("5", "Verlorene Projektäquivalente", f'=IF({V}=0,"–",{YR}/{V})', "#,##0.0", "Verlust pro Jahr ÷ Projektvolumen (rechnerisch)"),
]
for i, (n, label, formula, nf, expl) in enumerate(kpis):
    r = 30 + i
    h(r, 22)
    key = n == "4"
    put(f"B{r}", n, font(9, True, BLUE if key else SILVER), Alignment(horizontal="left", vertical="center", indent=1))
    put(f"C{r}", label, font(10, True, BLACK if key else TEXT))
    put(f"D{r}", formula, font(11 if key else 10, True, BLUE if key else BLACK), R, nf=nf)
    put(f"G{r}", expl, font(8.5, False, "5B616B"))
    for col in "BCDEFG":
        ws[f"{col}{r}"].border = Border(bottom=Side(style="hair", color=LINE))

# Hebel-Szenario
h(35, 14)
for r, pts in [(36, 22), (37, 20), (38, 40), (39, 22)]:
    h(r, pts); band(r, TINT, "BCDEFG")
for col in "BCDEFG":
    ws[f"{col}36"].border = Border(top=Side(style="thin", color=LBLUE))
    ws[f"{col}39"].border = Border(bottom=Side(style="thin", color=LBLUE))
put("B36", "HEBEL-SZENARIO", font(8, True, BLUE), Alignment(horizontal="left", vertical="bottom", indent=1), TINT, merge="E36")
put("B37", "Was wäre, wenn ihr nur die Hälfte eurer Zusatzwünsche abrechnen würdet?", font(11, True, BLACK),
    Alignment(horizontal="left", vertical="center", indent=1), TINT, merge="G37")
put("B38", f"={X}*0.5*{RATE}*{P}", Font(name=F, size=24, bold=True, color=BLUE),
    Alignment(horizontal="left", vertical="center", indent=1), TINT, '"+"#,##0" €";"-"#,##0" €";"+0 €"', merge="D38")
put("E38", "mögliches zusätzliches Abrechnungsvolumen pro Jahr", font(10, True, BLACK), L, TINT, merge="G38")
put("B39", f'="Rechnung: "&IF({X}=INT({X}),FIXED({X},0),FIXED({X},1))&" Std. Zusatzwünsche × 50 % × "&FIXED({RATE},0)&" € Stundensatz × "&FIXED({P},0)&" Projekte. Theoretisches Szenario – keine garantierte Ergebnisverbesserung."',
    font(8, False, "5B616B", italic=True), Alignment(horizontal="left", vertical="top", wrap_text=True, indent=1), TINT, merge="G39")
h(40, 4)

# Diagramm
put("G20", "VERLUST PRO JAHR VS. Ø PROJEKTVOLUMEN", font(7.5, True, SILVER), Alignment(horizontal="left", vertical="bottom"))

# ---------------------------------------------------------------- 03 Teaser
h(41, 14)
section(42, "03", "Was dieser Rechner nicht zeigt")
rows = [
    (44, 14, None, None),
    (45, 22, "Ihr kennt jetzt die Größenordnung.", font(13, True, WHITE)),
    (46, 18, "Offen bleibt:", font(10, False, SILVER)),
    (47, 18, "In welchen Projekten genau geht das Geld verloren?", "b"),
    (48, 18, "Bei welchen Kunden häuft sich der zusätzliche Aufwand?", "b"),
    (49, 18, "Welche Leistungen werden regelmäßig nicht abgerechnet?", "b"),
    (50, 18, "Woran erkennt man frühzeitig, dass ein laufendes Projekt wirtschaftlich aus dem Ruder läuft?", "b"),
    (51, 12, None, None),
    (52, 20, "Genau hier setzt NGCX Intelligence an.", font(11, True, WHITE)),
    (53, 30, "Wir machen wirtschaftliche Zusammenhänge in IT- und Softwareprojekten transparenter und helfen Unternehmen, bessere Entscheidungen auf Basis ihrer Projektdaten zu treffen.", font(9.5, False, "C9CDD3")),
    (54, 12, None, None),
    (55, 20, "Ihr möchtet wissen, wo eure konkreten Verluste entstehen?", font(11, True, LBLUE)),
    (56, 18, "Antworte einfach auf die E-Mail, mit der du diesen Rechner erhalten hast.", font(10, False, WHITE)),
    (57, 16, None, None),
]
for r, pts, txt, fnt in rows:
    h(r, pts); band(r, BLACK, "BCDEFG")
    if txt is None:
        continue
    if fnt == "b":
        put(f"B{r}", "—", font(10, True, LBLUE), Alignment(horizontal="right", vertical="center"), BLACK)
        put(f"C{r}", "  " + txt, font(10, False, WHITE), L, BLACK, merge=f"G{r}")
    else:
        put(f"B{r}", txt, fnt, Alignment(horizontal="left", vertical="center", wrap_text=True, indent=1), BLACK, merge=f"G{r}")
h(43, 10)

# Fußzeile
h(58, 10); h(59, 26)
put("B59", "Deine Eingaben bleiben in dieser Datei. Es werden keine Daten übertragen. Alle Werte basieren auf eigenen Schätzungen. "
    "Das Ergebnis dient ausschließlich der Orientierung und stellt keine betriebswirtschaftliche Beratung dar.",
    font(7.5, False, SILVER), LT, merge="G59")
h(60, 14)
put("B60", "NGCX INTELLIGENCE  ·  RADAR #1  ·  SCOPE-VERLUST-RECHNER", font(7, True, SILVER), merge="E60")
put("G60", "Know. Decide. Grow.", font(7, False, SILVER), R)

# ---------------------------------------------------------------- Blatt 2
for k, v in {"A": 2.5, "B": 34, "C": 46, "D": 34, "E": 2.5}.items():
    ws2.column_dimensions[k].width = v
ws2.sheet_view.showGridLines = False

def p2(cell, value=None, f=None, al=None, fl=None, nf=None, merge=None):
    c = ws2[cell]
    if value is not None:
        c.value = value
    c.font = f or font()
    c.alignment = al or Alignment(vertical="center", wrap_text=True)
    if fl:
        c.fill = fill(fl)
    if nf:
        c.number_format = nf
    if merge:
        ws2.merge_cells(f"{cell}:{merge}")

r = 1
for rr, pts in [(1, 10), (2, 18), (3, 30), (4, 18), (5, 12)]:
    ws2.row_dimensions[rr].height = pts
    for col in "ABCDE":
        ws2[f"{col}{rr}"].fill = fill(BLACK)
p2("B2", "NGCX INTELLIGENCE  ·  RADAR #1", font(9, True, LBLUE))
p2("D2", "Know. Decide. Grow.", font(9, False, SILVER), R)
p2("B3", "So funktioniert’s", font(18, True, WHITE), merge="D3")
p2("B4", "Berechnungslogik, Annahmen, Definitionen und Grenzen des Scope-Verlust-Rechners.", font(9, False, SILVER), merge="D4")

r = 7
def head2(title):
    global r
    ws2.row_dimensions[r].height = 22
    p2(f"B{r}", title, font(12, True, BLACK), merge=f"D{r}")
    for col in "BCD":
        ws2[f"{col}{r}"].border = Border(bottom=Side(style="medium", color=BLACK))
    r += 1
    ws2.row_dimensions[r].height = 6
    r += 1

def para(text, pts=30, f=None):
    global r
    ws2.row_dimensions[r].height = pts
    p2(f"B{r}", text, f or font(9.5), LT, merge=f"D{r}")
    r += 1

def table(header, data, heights=20, bold_row=None):
    global r
    ws2.row_dimensions[r].height = 18
    for col, t in zip("BCD", header):
        p2(f"{col}{r}", t, font(7.5, True, SILVER))
        ws2[f"{col}{r}"].border = Border(bottom=Side(style="thin", color=LINE))
    r += 1
    for i, row in enumerate(data):
        ws2.row_dimensions[r].height = heights
        for col, t in zip("BCD", row):
            key = bold_row is not None and i == bold_row
            p2(f"{col}{r}", t, font(9.5, col == "B", BLUE if key and col != "C" else TEXT), Alignment(horizontal="left", vertical="center", wrap_text=True, indent=0 if col == "B" else 1))
            ws2[f"{col}{r}"].border = Border(bottom=Side(style="hair", color=LINE))
        r += 1

head2("Die Idee")
para("Einzelne nicht abgerechnete Stunden wirken klein. Über viele Projekte hinweg summieren sie sich. "
     "Der Rechner zeigt in wenigen Minuten eine erste Größenordnung, wie viel Geld dadurch pro Jahr verloren gehen kann – "
     "auf Basis von sechs eigenen Schätzwerten.", 42)
r += 1
head2("Berechnungslogik")
table(["KENNZAHL", "FORMEL", "BEISPIEL MIT DEN VORBELEGTEN WERTEN"], [
    ("1  Unbezahlte Stunden pro Projekt", "Zusatzwünsche + Abstimmung + Nacharbeit", "15 + 10 + 8 = 33 Std."),
    ("2  Verlust pro Projekt", "Unbezahlte Stunden × Stundensatz", "33 Std. × 100 € = 3.300 €"),
    ("3  Verlustanteil am Projektvolumen", "Verlust pro Projekt ÷ Projektvolumen × 100", "3.300 € ÷ 30.000 € = 11,0 %"),
    ("4  Geschätzter Verlust pro Jahr", "Verlust pro Projekt × Projekte pro Jahr", "3.300 € × 20 = 66.000 €"),
    ("5  Verlorene Projektäquivalente", "Verlust pro Jahr ÷ Projektvolumen", "66.000 € ÷ 30.000 € = 2,2"),
    ("Hebel-Szenario", "Zusatzwünsche × 50 % × Stundensatz × Projekte pro Jahr", "15 × 50 % × 100 € × 20 = +15.000 €"),
], heights=22, bold_row=3)
r += 1
para("Projektäquivalente sind eine rein rechnerische Größe: Sie zeigen, wie vielen durchschnittlichen Projektvolumen der jährliche Verlust entspricht. "
     "Es handelt sich nicht um tatsächlich verlorene Aufträge.", 30, font(9, False, "5B616B", italic=True))
r += 1
head2("Ampel-Bewertung (Verlustanteil am Projektvolumen)")
table(["AMPEL", "BEREICH", "BEDEUTUNG"], [
    ("Grün", "unter 5 %", "Der nicht abgerechnete Aufwand ist im Verhältnis eher gering."),
    ("Gelb", "ab 5 % bis einschließlich 10 %", "Ein spürbarer Teil des Projektvolumens wird nicht abgerechnet."),
    ("Rot", "über 10 %", "Ein erheblicher Teil des Projektvolumens wird nicht abgerechnet."),
], heights=30)
amp_start = r - 3
for i, (bg, fg) in enumerate([(GREEN, WHITE), (YELLOW, BLACK), (RED, WHITE)]):
    c = ws2[f"B{amp_start+i}"]
    c.fill = fill(bg); c.font = font(9.5, True, fg); c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
para("NGCX-Orientierung – keine Studienwerte, Branchenbenchmarks oder wissenschaftlich validierten Grenzwerte.", 20,
     font(8.5, False, SILVER, italic=True))
r += 1
head2("Definitionen – was gehört in die Stundenfelder?")
table(["EINGABE", "GEMEINT IST", "NICHT GEMEINT IST"], [
    ("Nicht abgerechnete Zusatzwünsche", "Änderungen und Extras, die nicht im Angebot standen und trotzdem ohne Berechnung umgesetzt wurden.",
     "Zusatzleistungen, die per Nachtrag oder Change Request berechnet wurden."),
    ("Nicht abrechenbare Abstimmung", "Meetings, Calls und E-Mails über das kalkulierte Maß hinaus, die der Kunde nicht bezahlt.",
     "Abstimmung, die im Angebot eingeplant und damit bezahlt ist."),
    ("Nacharbeit nach Abnahme", "Korrekturen und Anpassungen nach dem offiziellen Projektabschluss ohne Berechnung.",
     "Vertraglich vereinbarte Gewährleistung oder bezahlte Wartung."),
], heights=40)
r += 1
head2("Annahmen und Grenzen")
for t in [
    "Alle Werte sind eure eigenen Schätzungen. Das Ergebnis ist so genau wie diese Schätzungen.",
    "Der Rechner arbeitet mit Durchschnittswerten. Einzelne Projekte können stark abweichen.",
    "Nicht abgerechnete Stunden werden mit dem vollen Stundensatz bewertet. Das zeigt entgangenes Abrechnungsvolumen, nicht den exakten Gewinneffekt.",
    "Das Hebel-Szenario ist theoretisch. Es zeigt kein garantiertes Ergebnis.",
    "Der Rechner zeigt die Größenordnung – nicht, bei welchen Kunden, Projekten oder Leistungen die Verluste entstehen.",
    "Eingaben: Zahlen ab 0; Projekte pro Jahr als ganze Zahl (bis 1.000). Obergrenzen: Projektvolumen 10 Mio. €, Stundensatz 1.000 €, je Stundenfeld 10.000 Std. Nicht berechenbare Kennzahlen (z. B. ohne Projektvolumen) werden als „–“ angezeigt.",
]:
    para("–  " + t, 28 if len(t) > 115 else 18)
r += 1
head2("Diagrammdaten (automatisch, bitte nicht ändern)")
ws2.row_dimensions[r].height = 18
p2(f"B{r}", "Ø Projektvolumen", font(9.5)); p2(f"C{r}", f"=Radar!{V.replace('$','')}" if False else f"=MAX(0,N(Radar!$D$11))", font(9.5), R, nf='#,##0" €"')
chart_r1 = r; r += 1
ws2.row_dimensions[r].height = 18
p2(f"B{r}", "Verlust pro Jahr", font(9.5)); p2(f"C{r}", "=IF(ISNUMBER(Radar!$D$33),Radar!$D$33,0)", font(9.5), R, nf='#,##0" €"')
chart_r2 = r; r += 2
ws2.row_dimensions[r].height = 26
p2(f"B{r}", "Deine Eingaben bleiben in dieser Datei. Es werden keine Daten übertragen. Alle Werte basieren auf eigenen Schätzungen. "
    "Das Ergebnis dient ausschließlich der Orientierung und stellt keine betriebswirtschaftliche Beratung dar.",
    font(7.5, False, SILVER), LT, merge=f"D{r}")
last2 = r

# ---------------------------------------------------------------- Diagramm
ch = BarChart()
ch.type = "bar"
ch.style = 2
ch.grouping = "clustered"
ch.varyColors = True
data = Reference(ws2, min_col=3, min_row=chart_r1, max_row=chart_r2)
cats = Reference(ws2, min_col=2, min_row=chart_r1, max_row=chart_r2)
ch.add_data(data, titles_from_data=False)
ch.set_categories(cats)
s = ch.series[0]
s.graphicalProperties = GraphicalProperties(solidFill=SILVER)
s.graphicalProperties.line = LineProperties(noFill=True)
for idx, col in [(0, "C9CDD3"), (1, BLUE)]:
    dp = DataPoint(idx=idx)
    dp.graphicalProperties = GraphicalProperties(solidFill=col)
    dp.graphicalProperties.line = LineProperties(noFill=True)
    s.dPt.append(dp)
s.dLbls = DataLabelList()
s.dLbls.showVal = True
s.dLbls.showSerName = s.dLbls.showCatName = s.dLbls.showLegendKey = False
s.dLbls.numFmt = '#,##0" €"'
s.dLbls.position = "inEnd"
from openpyxl.chart.text import RichText
from openpyxl.drawing.text import Paragraph, ParagraphProperties, CharacterProperties, RichTextProperties, Font as DFont
def txpr(size, color, bold=False):
    cp = CharacterProperties(sz=size * 100, b=bold, solidFill=color, latin=DFont(typeface=F))
    return RichText(bodyPr=RichTextProperties(), p=[Paragraph(pPr=ParagraphProperties(defRPr=cp), endParaRPr=cp)])
s.dLbls.txPr = txpr(9, WHITE, True)
ch.gapWidth = 45
ch.legend = None
ch.title = None
ch.roundedCorners = False
ch.x_axis.delete = False
ch.y_axis.delete = True
ch.x_axis.txPr = txpr(8, "5B616B")
ch.x_axis.majorGridlines = None
ch.y_axis.majorGridlines = None
ch.y_axis.scaling.min = 0
ch.x_axis.graphicalProperties = GraphicalProperties(ln=LineProperties(solidFill=LINE))
ch.plot_visible_only = False
ch.graphical_properties = GraphicalProperties(ln=LineProperties(noFill=True))
ch.width = 6.6
ch.height = 4.6
ws.add_chart(ch, "G21")

# ---------------------------------------------------------------- Schutz, Druck
for sh in (ws, ws2):
    sh.protection.sheet = True
    sh.protection.formatCells = True
    sh.protection.formatColumns = True
    sh.protection.formatRows = True
    sh.page_setup.orientation = "portrait"
    sh.page_setup.paperSize = sh.PAPERSIZE_A4
    sh.page_setup.fitToWidth = 1
    sh.page_setup.fitToHeight = 1
    sh.sheet_properties.pageSetUpPr.fitToPage = True
    sh.print_options.horizontalCentered = True
    sh.page_margins = PageMargins(left=0.4, right=0.4, top=0.45, bottom=0.45, header=0.2, footer=0.2)
ws.print_area = "A1:H60"
ws2.print_area = f"A1:E{last2}"
ws.sheet_view.selection[0].activeCell = "D10"
ws.sheet_view.selection[0].sqref = "D10"
wb.calculation.fullCalcOnLoad = True
wb.properties.title = "NGCX Radar #1 – Scope-Verlust-Rechner"
wb.properties.creator = "NGCX Intelligence"
wb.save(OUT)
print("saved", OUT)
