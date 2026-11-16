import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Zeigt nur, OB Integrationen serverseitig konfiguriert sind – niemals die Schlüssel selbst. */
export async function GET() {
  return NextResponse.json({
    ai: { configured: (process.env.AI_PROVIDER ?? "none") !== "none" && !!process.env.ANTHROPIC_API_KEY, provider: process.env.AI_PROVIDER ?? "none", model: process.env.AI_MODEL || "claude-opus-5-5" },
    marketData: { configured: !!process.env.ALPHAVANTAGE_API_KEY, provider: "Alpha Vantage" },
    interestRates: { configured: true, provider: "EZB Data Portal (ohne Schlüssel)" },
  });
}
