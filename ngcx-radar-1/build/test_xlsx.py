"""Testet Pflichtwerte und Randfälle: setzt Eingaben auf Kopien, rechnet mit LibreOffice neu, prüft Ergebnisse."""
import json, os, shutil, subprocess, sys, tempfile
from openpyxl import load_workbook
SRC = sys.argv[1]; SK = sys.argv[2]
INPUTS = ["D10", "D11", "D12", "D13", "D14", "D15"]
OUTS = {"Stunden": "D30", "Verlust/Projekt": "D31", "Anteil": "D32", "Verlust/Jahr": "D33",
        "Äquivalente": "D34", "Ampel": "D25", "Hebel": "B38", "Hero": "B21", "Satz": "B22", "Ampeltext": "B25", "Rechnung": "B39"}
cases = {
    "Beispielwerte": [20, 30000, 100, 15, 10, 8],
    "Alles null": [0, 0, 0, 0, 0, 0],
    "Projektvolumen null": [20, 0, 100, 15, 10, 8],
    "Stundensatz null": [20, 30000, 0, 15, 10, 8],
    "Sehr hoher Stundensatz": [20, 30000, 1000, 15, 10, 8],
    "Sehr viele Projekte": [1000, 30000, 100, 15, 10, 8],
    "Sehr hohe Stunden": [20, 30000, 100, 10000, 10000, 10000],
    "Null + Maximalwerte": [1000, 0, 1000, 10000, 0, 10000],
    "Alle Maximalwerte": [10000, 100000000, 10000, 10000, 10000, 10000],
    "Grenze 5 % (gelb)": [20, 30000, 100, 15, 0, 0],
    "Grenze 10 % (gelb)": [20, 30000, 100, 15, 15, 0],
    "Knapp unter 5 % (grün)": [20, 30000, 100, 14.9, 0, 0],
    "Leere Felder": [None, None, None, None, None, None],
    "Text eingefügt": ["abc", "x", 100, "15", 10, 8],
    "Negativ eingefügt": [20, 30000, -100, 15, 10, 8],
    "Dezimalstunden": [12, 45000, 95.5, 7.5, 3.25, 0],
}
ERR = ("#DIV", "#VALUE", "#REF", "#NAME", "#N/A", "#NUM", "Err:", "#WERT", "#BEZUG", "#NULL")
tmp = tempfile.mkdtemp()
report, ok = {}, True
for name, vals in cases.items():
    p = os.path.join(tmp, "t.xlsx"); shutil.copy(SRC, p)
    wb = load_workbook(p); ws = wb["Radar"]
    for c, v in zip(INPUTS, vals): ws[c].value = v
    wb.save(p)
    env = dict(os.environ, LC_ALL="de_DE.UTF-8", LANG="de_DE.UTF-8")
    r = json.loads(subprocess.run([sys.executable, f"{SK}/recalc.py", p, "60"], capture_output=True, text=True, env=env).stdout)
    ws = load_workbook(p, data_only=True)["Radar"]
    res = {k: ws[c].value for k, c in OUTS.items()}
    errs = [k for k, v in res.items() if v is None or any(e in str(v) for e in ERR)]
    if r.get("total_errors") or errs: ok = False
    report[name] = {"inputs": vals, "results": res, "errors": errs, "recalc_errors": r.get("total_errors")}
    print(f"{'OK ' if not errs and not r.get('total_errors') else 'ERR'} {name}: " + ", ".join(f"{k}={res[k]!r}" for k in ["Stunden","Verlust/Projekt","Anteil","Verlust/Jahr","Äquivalente","Ampel","Hebel"]))
b = report["Beispielwerte"]["results"]
exp = {"Stunden": 33, "Verlust/Projekt": 3300, "Anteil": 0.11, "Verlust/Jahr": 66000, "Äquivalente": 2.2, "Ampel": "ROT", "Hebel": 15000}
for k, v in exp.items():
    good = abs(b[k] - v) < 1e-9 if isinstance(v, (int, float)) else b[k] == v
    ok &= good
    print(("PASS" if good else "FAIL"), k, b[k], "erwartet", v)
json.dump(report, open(sys.argv[3], "w"), ensure_ascii=False, indent=1, default=str)
print("GESAMT:", "BESTANDEN" if ok else "FEHLER")
