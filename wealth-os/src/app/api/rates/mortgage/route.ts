import { NextResponse } from "next/server";
import { parseSdmxCsv } from "@/lib/finance/sdmx";

export const runtime = "nodejs";

/**
 * Bauzinsen aus dem EZB Data Portal (MFI-Zinsstatistik, kostenlos, ohne Schlüssel, read-only).
 * Standard: Deutschland, Wohnungsbaukredite an private Haushalte, anfängliche Zinsbindung > 10 Jahre, Neugeschäft.
 * Serie per ECB_MORTGAGE_SERIES überschreibbar.
 */
export async function GET() {
  const series = process.env.ECB_MORTGAGE_SERIES || "MIR/M.DE.B.A2C.P.R.A.2250.EUR.N";
  if (!/^[A-Z0-9_]+\/[A-Z0-9.]+$/.test(series)) return NextResponse.json({ error: "Ungültige Serien-Kennung." }, { status: 400 });
  const url = `https://data-api.ecb.europa.eu/service/data/${series}?lastNObservations=12&format=csvdata`;
  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return NextResponse.json({ error: `EZB-API antwortete mit ${r.status}.` }, { status: 502 });
    const obs = parseSdmxCsv(await r.text());
    if (!obs.length) return NextResponse.json({ error: "Keine Beobachtungen erhalten." }, { status: 502 });
    return NextResponse.json({ source: `EZB Data Portal, ${series}`, latest: obs[obs.length - 1], history: obs });
  } catch (e) {
    return NextResponse.json({ error: `Abruf fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
