import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";

export interface Workspace {
  id: string;
  name: string;
  kind: "personal" | "business";
  description: string;
  profile: Record<string, unknown>;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export const workspaceInput = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche"),
  name: z.string().min(1).max(80),
  kind: z.enum(["personal", "business"]).default("business"),
  description: z.string().max(2000).default(""),
  profile: z.record(z.string(), z.unknown()).default({}),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1677FF"),
});

export async function listWorkspaces(includeArchived = false): Promise<Workspace[]> {
  const db = await getDb();
  return db.query<Workspace>(
    `SELECT * FROM workspaces ${includeArchived ? "" : "WHERE NOT archived"} ORDER BY (kind = 'personal') DESC, created_at`,
  );
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const db = await getDb();
  return (await db.query<Workspace>(`SELECT * FROM workspaces WHERE id = $1`, [id]))[0] ?? null;
}

export async function createWorkspace(raw: z.input<typeof workspaceInput>, actor: string) {
  const w = workspaceInput.parse(raw);
  const db = await getDb();
  const rows = await db.query<Workspace>(
    `INSERT INTO workspaces (id, name, kind, description, profile, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [w.id, w.name, w.kind, w.description, JSON.stringify(w.profile), w.color],
  );
  await audit({ actor, action: "workspace.create", target: w.id, workspaceId: w.id, level: 3, details: { name: w.name } });
  return rows[0];
}

export const workspacePatch = workspaceInput.omit({ id: true, kind: true }).partial().extend({ archived: z.boolean().optional() });

export async function updateWorkspace(id: string, raw: z.input<typeof workspacePatch>, actor: string) {
  const p = workspacePatch.parse(raw);
  const db = await getDb();
  const cur = await getWorkspace(id);
  if (!cur) throw new Error("Workspace nicht gefunden");
  if (id === "personal" && p.archived) throw new Error("Der persönliche Workspace kann nicht archiviert werden.");
  const rows = await db.query<Workspace>(
    `UPDATE workspaces SET name=$2, description=$3, profile=$4, color=$5, archived=$6, updated_at=now() WHERE id=$1 RETURNING *`,
    [id, p.name ?? cur.name, p.description ?? cur.description, JSON.stringify(p.profile ?? cur.profile), p.color ?? cur.color, p.archived ?? cur.archived],
  );
  await audit({ actor, action: "workspace.update", target: id, workspaceId: id, level: 3, details: { fields: Object.keys(p) } });
  return rows[0];
}
