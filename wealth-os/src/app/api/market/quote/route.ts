import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Read-only Kursabfrage über Alpha Vantage (GLOBAL_QUOTE).
 * Kostenloser Schlüssel (begrenzte Abfragen/Tag). Wird nur aufgerufen, wenn der Nutzer die Integration aktiviert hat.
 * Es werden keine Orders ausgeführt – die API kann das auch gar nicht.
 */
export async function GET(req: Request) {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) return NextResponse.json({ error: "ALPHAVANTAGE_API_KEY ist nicht gesetzt (.env.local)." }, { status: 503 });
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Ungültiges Symbol." }, { status: 400 });
  try {
    const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const j = (await r.json()) as Record<string, Record<string, string> | string>;
    const q = j["Global Quote"] as Record<string, string> | undefined;
    if (!q || !q["05. price"]) {
      const note = (j["Note"] ?? j["Information"] ?? j["Error Message"]) as string | undefined;
      return NextResponse.json({ error: note ? `Alpha Vantage: ${note}` : "Kein Kurs gefunden – Symbol prüfen (z. B. VWCE.DEX)." }, { status: 404 });
    }
    return NextResponse.json({
      symbol: q["01. symbol"],
      price: Number(q["05. price"]),
      date: q["07. latest trading day"],
      currency: symbol.endsWith(".DEX") || symbol.endsWith(".FRK") ? "EUR" : undefined,
      source: "Alpha Vantage",
    });
  } catch (e) {
    return NextResponse.json({ error: `Abruf fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
}
