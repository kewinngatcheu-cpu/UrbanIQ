import { NextResponse } from "next/server";
import { z } from "zod";
import { api, HttpError, readJson } from "@/lib/http";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const GET = api<Ctx>(async (_req, { params }) => {
  const id = uuid.parse((await params).id);
  const db = await getDb();
  const [conv] = await db.query(`SELECT * FROM conversations WHERE id = $1`, [id]);
  if (!conv) throw new HttpError(404, "Unterhaltung nicht gefunden.");
  const messages = await db.query(`SELECT id, role, content, provider, model, metadata, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at`, [id]);
  return NextResponse.json({ conversation: conv, messages });
});

export const PATCH = api<Ctx>(async (req, { params }) => {
  const id = uuid.parse((await params).id);
  const { title } = z.object({ title: z.string().min(1).max(120) }).parse(await readJson(req));
  const db = await getDb();
  await db.query(`UPDATE conversations SET title = $2 WHERE id = $1`, [id, title]);
  return NextResponse.json({ ok: true });
});

export const DELETE = api<Ctx>(async (_req, { params }) => {
  const id = uuid.parse((await params).id);
  const db = await getDb();
  const rows = await db.query<{ workspace_id: string; title: string }>(`DELETE FROM conversations WHERE id = $1 RETURNING workspace_id, title`, [id]);
  if (!rows.length) throw new HttpError(404, "Unterhaltung nicht gefunden.");
  await audit({ actor: "owner", action: "conversation.delete", target: id, workspaceId: rows[0].workspace_id, level: 3, details: { title: rows[0].title } });
  return NextResponse.json({ ok: true });
});
