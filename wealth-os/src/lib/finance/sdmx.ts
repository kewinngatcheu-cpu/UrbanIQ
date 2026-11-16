/** Parser für SDMX-CSV (EZB/Bundesbank): liefert [{ period, value }] chronologisch. */
export function parseSdmxCsv(csv: string): { period: string; value: number }[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const split = (l: string) => l.split(",").map((x) => x.replace(/^"|"$/g, ""));
  const head = split(lines[0]);
  const ip = head.indexOf("TIME_PERIOD");
  const iv = head.indexOf("OBS_VALUE");
  if (ip < 0 || iv < 0) return [];
  return lines
    .slice(1)
    .map(split)
    .filter((c) => c[ip] && c[iv] !== undefined && c[iv].trim() !== "") // leere Werte ≠ 0 %
    .map((c) => ({ period: c[ip], value: Number(c[iv]) }))
    .filter((o) => Number.isFinite(o.value))
    .sort((a, b) => a.period.localeCompare(b.period));
}
