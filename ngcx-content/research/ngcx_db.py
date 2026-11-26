#!/usr/bin/env python3
"""NGCX contact database helper (dedupe + append).

Usage:
  python3 ngcx_db.py check <linkedin_url_or_domain> [...]   -> prints DUPLICATE/NEW per value
  python3 ngcx_db.py add <json_file>                         -> appends records (list of dicts), refuses duplicates
  python3 ngcx_db.py stats                                   -> counts
Rule: no person (LinkedIn URL / name+company) and no company (domain) may appear twice.
Excluded candidates are stored too (status "excluded") so they are not re-checked.
"""
import json, sys, os, unicodedata, urllib.parse
DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contacts-db.json")

def norm_url(u):
    u = urllib.parse.unquote((u or "").strip().lower()).rstrip("/")
    for p in ("https://", "http://", "www.", "de.", "at.", "ch."):
        if u.startswith(p): u = u[len(p):]
    return u
def norm_dom(d):
    d = (d or "").strip().lower()
    for p in ("https://", "http://", "www."):
        if d.startswith(p): d = d[len(p):]
    return d.split("/")[0]
def norm_name(n):
    return unicodedata.normalize("NFKD", (n or "").lower()).encode("ascii", "ignore").decode().strip()

def load():
    with open(DB, encoding="utf-8") as f: return json.load(f)
def save(db):
    with open(DB, "w", encoding="utf-8") as f: json.dump(db, f, ensure_ascii=False, indent=2); f.write("\n")

def is_dup(db, rec):
    for r in db["contacts"]:
        if rec.get("linkedin_url") and norm_url(r.get("linkedin_url")) == norm_url(rec["linkedin_url"]): return "linkedin_url", r
        if rec.get("domain") and norm_dom(r.get("domain")) == norm_dom(rec["domain"]): return "company_domain", r
        if norm_name(r.get("name")) == norm_name(rec.get("name")) and norm_name(r.get("company")) == norm_name(rec.get("company")): return "name+company", r
    return None

if __name__ == "__main__":
    db = load(); cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    if cmd == "check":
        for v in sys.argv[2:]:
            hit = next((r for r in db["contacts"] if norm_url(r.get("linkedin_url")) == norm_url(v) or norm_dom(r.get("domain")) == norm_dom(v)), None)
            print(("DUPLICATE " + hit["name"] + " / " + hit["company"] + " (" + hit["status"] + ", " + hit["date"] + ")") if hit else "NEW", v)
    elif cmd == "add":
        recs = json.load(open(sys.argv[2], encoding="utf-8")); added = 0
        for rec in recs:
            d = is_dup(db, rec)
            if d: print("SKIP duplicate (%s): %s / %s" % (d[0], rec.get("name"), rec.get("company"))); continue
            db["contacts"].append(rec); added += 1
        save(db); print("added", added)
    elif cmd != "report":
        c = db["contacts"]
        print("total", len(c), "| daily_list", sum(r["status"] == "daily_list" for r in c), "| excluded", sum(r["status"] == "excluded" for r in c))

def report(date):
    db = load(); rows = sorted([r for r in db["contacts"] if r["date"] == date and r["status"] == "daily_list"], key=lambda r: r.get("nr", 99))
    out = ["| Nr. | Name | Position | Unternehmen | Standort | Mitarbeiter | Unternehmenswebsite | LinkedIn-Profil | Fit |", "|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        out.append("| %s | %s | %s | %s | %s | %s | %s | [Profil](%s) | %s |" % (r["nr"], r["name"], r["position"], r["company"], r["location"], r["employees"], r["website"], r["linkedin_url"], r["fit"]))
    out.append("")
    for r in rows:
        out += ["**%s. %s – %s**" % (r["nr"], r["name"], r["company"]), "- Warum interessant: " + r["reason"], "- Wachstumssignale: " + r["signals"], "- Verifizierung: " + r["verification"], ""]
    return "\n".join(out)

if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[1] == "report":
    print(report(sys.argv[2]))
