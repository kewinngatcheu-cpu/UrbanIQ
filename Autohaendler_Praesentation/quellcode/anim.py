"""Post-process pptxgenjs output: add slide transitions + entrance animations.
Shapes named A<nn><e>_<name> are animated in group order nn with effect e:
  f = fade in, w = wipe from left, z = slow 'Ken Burns' grow on background image.
"""
import re, sys, zipfile, shutil

src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
files = {n: zin.read(n) for n in zin.namelist()}

HERO = {1, 10}  # slides with fade-through-black transition

class Ids:
    def __init__(s, start): s.n = start
    def __call__(s): s.n += 1; return s.n

def effect(ids, spid, kind, delay):
    if kind == "z":
        return (f'<p:par><p:cTn id="{ids()}" presetID="6" presetClass="emph" presetSubtype="0" fill="hold" nodeType="withEffect">'
                f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
                f'<p:animScale><p:cBhvr><p:cTn id="{ids()}" dur="9000" fill="hold"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr>'
                f'<p:by x="106000" y="106000"/></p:animScale></p:childTnLst></p:cTn></p:par>')
    if kind == "w":
        preset, sub, filt, dur = 22, 8, "wipe(left)", 700
    else:
        preset, sub, filt, dur = 10, 0, "fade", 600
    return (f'<p:par><p:cTn id="{ids()}" presetID="{preset}" presetClass="entr" presetSubtype="{sub}" fill="hold" grpId="0" nodeType="withEffect">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
            f'<p:set><p:cBhvr><p:cTn id="{ids()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:to><p:strVal val="visible"/></p:to></p:set>'
            f'<p:animEffect transition="in" filter="{filt}"><p:cBhvr><p:cTn id="{ids()}" dur="{dur}"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
            f'</p:childTnLst></p:cTn></p:par>')

report = []
for name in sorted(files):
    m = re.fullmatch(r"ppt/slides/slide(\d+)\.xml", name)
    if not m:
        continue
    num = int(m.group(1))
    xml = files[name].decode("utf8")

    # 1) make shape ids unique (pptxgenjs can reuse an id for the slide-number placeholder)
    seen, maxid = set(), 0
    for i in re.findall(r'<p:cNvPr id="(\d+)"', xml):
        maxid = max(maxid, int(i))
    def fix(mm):
        global_ = fix.__dict__
        i = int(mm.group(1))
        if i in seen:
            global_["max"] += 1; i = global_["max"]
        seen.add(i)
        return f'<p:cNvPr id="{i}"'
    fix.__dict__["max"] = maxid
    xml = re.sub(r'<p:cNvPr id="(\d+)"', fix, xml)
    xml = xml.replace('descr="preencoded.png"', 'descr="Icon"')

    # 2) collect animated shapes
    targets = []  # (order, kind, spid, element_type)
    for mm in re.finditer(r'<p:(sp|pic|graphicFrame)>\s*<p:nv\w+>\s*<p:cNvPr id="(\d+)" name="A(\d\d)([fwz])_', xml):
        targets.append((int(mm.group(3)), mm.group(4), mm.group(2), mm.group(1)))
    # strip the animation prefix from shape names (cleaner selection pane)
    xml = re.sub(r'name="A\d\d[fwz]_', 'name="', xml)

    # 3) transition
    trans = '<p:transition spd="slow"><p:fade thruBlk="1"/></p:transition>' if num in HERO else '<p:transition spd="med"><p:fade/></p:transition>'

    timing = ""
    if targets:
        ids = Ids(4)
        orders = sorted({t[0] for t in targets})
        step = 230
        effs = []
        for t in sorted(targets, key=lambda t: (t[0], int(t[2]))):
            rank = orders.index(t[0])
            delay = 200 + rank * step if t[1] != "z" else 0
            effs.append(effect(ids, t[2], t[1], delay))
        bld = "".join(
            f'<p:bldP spid="{t[2]}" grpId="0" animBg="1"/>' if t[3] == "sp" else
            (f'<p:bldGraphic spid="{t[2]}" grpId="0"><p:bldAsOne/></p:bldGraphic>' if t[3] == "graphicFrame" else "")
            for t in targets if t[1] != "z")
        timing = ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
                  '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
                  '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
                  '<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
                  + "".join(effs) +
                  '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>'
                  '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
                  '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
                  '</p:childTnLst></p:cTn></p:par></p:tnLst>'
                  + (f'<p:bldLst>{bld}</p:bldLst>' if bld else "") + '</p:timing>')
    assert "</p:clrMapOvr></p:sld>" in xml
    xml = xml.replace("</p:clrMapOvr></p:sld>", "</p:clrMapOvr>" + trans + timing + "</p:sld>")
    files[name] = xml.encode("utf8")
    report.append(f"Folie {num}: {len(targets)} animierte Objekte in {len({t[0] for t in targets})} Stufen")

with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
    # [Content_Types].xml first
    for n in sorted(files, key=lambda n: n != "[Content_Types].xml"):
        z.writestr(n, files[n])
print("\n".join(report))
