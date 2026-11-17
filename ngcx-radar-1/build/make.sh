#!/bin/bash
# Baut Excel (inkl. Neuberechnung mit deutschem Gebietsschema) und rendert eine Vorschau.
set -e
cd "$(dirname "$0")/.."
SK=${XLSX_SKILL:-/root/.claude/skills/synced/079eb6aa-1ac3-4a7a-95ec-062edcd91295_7c90c2a5-bd71-4d2d-891d-eb4afb3d51e1/xlsx/scripts}
X=output/NGCX_Radar_1_Scope-Verlust-Rechner.xlsx
python3 build/build_xlsx.py "$X"
LC_ALL=de_DE.UTF-8 LANG=de_DE.UTF-8 python3 "$SK/recalc.py" "$X" 60
