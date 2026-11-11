import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { getDb } from "@/lib/db";

export const GET = api(async (req) => {
  const ws = req.nextUrl.searchParams.get("workspace");
  const db = await getDb();
  const rows = await db.query(
    `SELECT c.id, c.workspace_id, c.title, c.updated_at, (SELECT count(*)::int FROM messages m WHERE m.conversation_id = c.id) AS message_count
     FROM conversations c ${ws ? "WHERE c.workspace_id = $1" : ""} ORDER BY c.updated_at DESC LIMIT 100`, ws ? [ws] : []);
  return NextResponse.json({ conversations: rows });
});
