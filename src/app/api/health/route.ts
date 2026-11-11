import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Liveness + DB check. Exposes no personal data. */
export async function GET() {
  try {
    const db = await getDb();
    await db.query(`SELECT 1`);
    return NextResponse.json({ ok: true, db: db.driver });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
