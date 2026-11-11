import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getEmbedder, toPgVector } from "./embeddings";

export const LAYERS = ["identity", "personal", "business", "project", "conversational", "strategic", "operational"] as const;
export const STATUSES = ["active", "proposed", "uncertain", "outdated", "archived"] as const;
export type Layer = (typeof LAYERS)[number];
export type MemoryStatus = (typeof STATUSES)[number];

export interface Memory {
  id: string;
  workspace_id: string;
  layer: Layer;
  category: string;
  title: string;
  content: string;
  source: string;
  source_ref: string | null;
  confidence: number;
  importance: number;
  pinned: boolean;
  status: MemoryStatus;
  review_at: string | null;
  expires_at: string | null;
  shared_with: string[];
  superseded_by: string | null;
  embedding_model: string | null;
  version: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  score?: number;
}

const COLS = `id, workspace_id, layer, category, title, content, source, source_ref, confidence, importance, pinned, status,
  review_at, expires_at, shared_with, superseded_by, embedding_model, version, last_used_at, created_at, updated_at`;

export const memoryInput = z.object({
  workspaceId: z.string().min(1).max(64),
  layer: z.enum(LAYERS),
  category: z.string().min(1).max(64).default("general"),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(8000),
  source: z.string().max(64).default("user"),
  sourceRef: z.string().max(200).nullish(),
  confidence: z.number().min(0).max(1).default(1),
  importance: z.number().int().min(1).max(5).default(3),
  pinned: z.boolean().default(false),
  status: z.enum(STATUSES).default("active"),
  reviewAt: z.string().datetime({ offset: true }).nullish(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
  sharedWith: z.array(z.string().max(64)).max(20).default([]),
});
export type MemoryInput = z.input<typeof memoryInput>;

export const memoryPatch = memoryInput.partial().omit({ workspaceId: true, source: true, sourceRef: true }).extend({
  reason: z.string().max(500).optional(),
});
export type MemoryPatch = z.input<typeof memoryPatch>;

/** Thresholds on cosine similarity (same embedding model only). */
export const DUPLICATE_THRESHOLD = 0.92;
export const RELATED_THRESHOLD = 0.6;

/**
 * Isolation rule: a workspace sees its own memories, the owner's identity layer (who Kewin is),
 * and memories that were EXPLICITLY shared into it. Nothing else crosses workspace boundaries.
 */
const scopeSql = (p: string) => `(m.workspace_id = ${p} OR (m.layer = 'identity' AND m.workspace_id = 'personal') OR ${p} = ANY(m.shared_with))`;

async function embedText(title: string, content: string) {
  const embedder = getEmbedder();
  const [v] = await embedder.embed([`${title}\n${content}`]);
  return { vec: toPgVector(v), model: embedder.id };
}

export type CreateResult =
  | { kind: "created"; memory: Memory; related: Memory[] }
  | { kind: "duplicate"; existing: Memory };

export async function createMemory(raw: MemoryInput, actor: string, opts: { allowDuplicate?: boolean } = {}): Promise<CreateResult> {
  const input = memoryInput.parse(raw);
  const db = await getDb();
  const ws = await db.query(`SELECT id FROM workspaces WHERE id = $1`, [input.workspaceId]);
  if (!ws.length) throw new Error(`Unbekannter Workspace: ${input.workspaceId}`);

  const { vec, model } = await embedText(input.title, input.content);
  const similar = await db.query<Memory>(
    `SELECT ${COLS}, 1 - (embedding <=> $1::vector) AS score FROM memories m
     WHERE workspace_id = $2 AND embedding_model = $3 AND status IN ('active','proposed','uncertain')
     ORDER BY embedding <=> $1::vector LIMIT 5`,
    [vec, input.workspaceId, model],
  );
  const dup = similar.find((m) => (m.score ?? 0) >= DUPLICATE_THRESHOLD);
  if (dup && !opts.allowDuplicate) return { kind: "duplicate", existing: dup };

  const [memory] = await db.transaction(async (tx) => {
    const rows = await tx.query<Memory>(
      `INSERT INTO memories (workspace_id, layer, category, title, content, source, source_ref, confidence, importance, pinned,
         status, review_at, expires_at, shared_with, embedding, embedding_model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::vector,$16) RETURNING ${COLS}`,
      [input.workspaceId, input.layer, input.category, input.title, input.content, input.source, input.sourceRef ?? null,
        input.confidence, input.importance, input.pinned, input.status, input.reviewAt ?? null, input.expiresAt ?? null,
        input.sharedWith, vec, model],
    );
    await tx.query(
      `INSERT INTO memory_versions (memory_id, version, title, content, status, changed_by, reason) VALUES ($1,1,$2,$3,$4,$5,'created')`,
      [rows[0].id, input.title, input.content, input.status, actor],
    );
    return rows;
  });
  await audit({ actor, action: "memory.create", target: memory.id, workspaceId: input.workspaceId, level: actor === "owner" ? 3 : 2,
    details: { title: input.title, layer: input.layer, status: input.status } });
  const related = similar.filter((m) => (m.score ?? 0) >= RELATED_THRESHOLD && m.id !== memory.id);
  return { kind: "created", memory, related };
}

export async function getMemory(id: string): Promise<Memory | null> {
  const db = await getDb();
  const rows = await db.query<Memory>(`SELECT ${COLS} FROM memories m WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getMemoryHistory(id: string) {
  const db = await getDb();
  return db.query(`SELECT version, title, content, status, changed_by, reason, created_at FROM memory_versions WHERE memory_id = $1 ORDER BY version DESC`, [id]);
}

/** Updates never silently overwrite: every content/status change writes a new version row. */
export async function updateMemory(id: string, rawPatch: MemoryPatch, actor: string): Promise<Memory> {
  const patch = memoryPatch.parse(rawPatch);
  const db = await getDb();
  const current = await getMemory(id);
  if (!current) throw new NotFoundError("Erinnerung nicht gefunden");

  const next = {
    layer: patch.layer ?? current.layer,
    category: patch.category ?? current.category,
    title: patch.title ?? current.title,
    content: patch.content ?? current.content,
    confidence: patch.confidence ?? current.confidence,
    importance: patch.importance ?? current.importance,
    pinned: patch.pinned ?? current.pinned,
    status: patch.status ?? current.status,
    review_at: patch.reviewAt !== undefined ? patch.reviewAt : current.review_at,
    expires_at: patch.expiresAt !== undefined ? patch.expiresAt : current.expires_at,
    shared_with: patch.sharedWith ?? current.shared_with,
  };
  const textChanged = next.title !== current.title || next.content !== current.content;
  const versioned = textChanged || next.status !== current.status;
  const emb = textChanged ? await embedText(next.title, next.content) : null;

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.query<Memory>(
      `UPDATE memories SET layer=$2, category=$3, title=$4, content=$5, confidence=$6, importance=$7, pinned=$8, status=$9,
         review_at=$10, expires_at=$11, shared_with=$12,
         embedding = COALESCE($13::vector, embedding), embedding_model = COALESCE($14, embedding_model),
         version = version + $15, updated_at = now()
       WHERE id = $1 RETURNING ${COLS}`,
      [id, next.layer, next.category, next.title, next.content, next.confidence, next.importance, next.pinned, next.status,
        next.review_at, next.expires_at, next.shared_with, emb?.vec ?? null, emb?.model ?? null, versioned ? 1 : 0],
    );
    if (versioned) {
      await tx.query(
        `INSERT INTO memory_versions (memory_id, version, title, content, status, changed_by, reason) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, rows[0].version, next.title, next.content, next.status, actor, patch.reason ?? null],
      );
    }
    return rows;
  });
  const sharingChanged = JSON.stringify(next.shared_with) !== JSON.stringify(current.shared_with);
  await audit({ actor, action: sharingChanged ? "memory.share" : "memory.update", target: id, workspaceId: current.workspace_id,
    level: 3, details: { fields: Object.keys(patch), reason: patch.reason, shared_with: sharingChanged ? next.shared_with : undefined } });
  return updated;
}

export async function deleteMemory(id: string, actor: string) {
  const db = await getDb();
  const current = await getMemory(id);
  if (!current) throw new NotFoundError("Erinnerung nicht gefunden");
  await db.query(`DELETE FROM memories WHERE id = $1`, [id]);
  await audit({ actor, action: "memory.delete", target: id, workspaceId: current.workspace_id, level: 3, details: { title: current.title } });
}

export interface SearchOpts {
  workspaceId?: string; // undefined = all workspaces (Memory Center only, never for AI context)
  q?: string;
  layer?: Layer;
  status?: MemoryStatus | "all";
  pinned?: boolean;
  limit?: number;
}

export async function searchMemories(opts: SearchOpts): Promise<Memory[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (opts.workspaceId) where.push(`m.workspace_id = ${p(opts.workspaceId)}`);
  if (opts.layer) where.push(`m.layer = ${p(opts.layer)}`);
  if (opts.status && opts.status !== "all") where.push(`m.status = ${p(opts.status)}`);
  if (!opts.status) where.push(`m.status <> 'archived'`);
  if (opts.pinned) where.push(`m.pinned`);
  const limit = Math.min(opts.limit ?? 100, 500);

  if (opts.q?.trim()) {
    const { vec, model } = await embedText("", opts.q);
    const v = p(vec), mdl = p(model), like = p(`%${opts.q.trim()}%`);
    return db.query<Memory>(
      `SELECT ${COLS},
         (CASE WHEN m.embedding_model = ${mdl} THEN 1 - (m.embedding <=> ${v}::vector) ELSE 0 END)
         + (CASE WHEN m.title ILIKE ${like} OR m.content ILIKE ${like} OR m.category ILIKE ${like} THEN 0.35 ELSE 0 END) AS score
       FROM memories m ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY score DESC LIMIT ${limit}`,
      params,
    ).then((rows) => rows.filter((r) => (r.score ?? 0) > 0.12));
  }
  return db.query<Memory>(
    `SELECT ${COLS} FROM memories m ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY m.pinned DESC, m.importance DESC, m.updated_at DESC LIMIT ${limit}`,
    params,
  );
}

/**
 * Context retrieval for the AI core. Strictly workspace-scoped (see scopeSql).
 * Ranking = semantic similarity + importance + pinning; pinned identity facts are always included.
 */
export async function retrieveContext(workspaceId: string, query: string, limit = 10): Promise<Memory[]> {
  const db = await getDb();
  const { vec, model } = await embedText("", query);
  const rows = await db.query<Memory>(
    `SELECT ${COLS},
       (CASE WHEN m.embedding_model = $3 THEN 1 - (m.embedding <=> $2::vector) ELSE 0 END) * 0.7
       + (m.importance / 5.0) * 0.2 + (CASE WHEN m.pinned THEN 0.15 ELSE 0 END) AS score
     FROM memories m
     WHERE ${scopeSql("$1")} AND m.status IN ('active','uncertain')
       AND (m.expires_at IS NULL OR m.expires_at > now())
     ORDER BY score DESC LIMIT $4`,
    [workspaceId, vec, model, limit],
  );
  const pinnedIdentity = await db.query<Memory>(
    `SELECT ${COLS} FROM memories m WHERE m.workspace_id = 'personal' AND m.layer = 'identity' AND m.pinned AND m.status = 'active'
     ORDER BY m.importance DESC LIMIT 6`,
  );
  const seen = new Set<string>();
  const out: Memory[] = [];
  for (const m of [...pinnedIdentity, ...rows]) if (!seen.has(m.id)) { seen.add(m.id); out.push(m); }
  if (out.length) await db.query(`UPDATE memories SET last_used_at = now() WHERE id = ANY($1::uuid[])`, [out.map((m) => m.id)]);
  return out;
}

export async function memoryStats() {
  const db = await getDb();
  return db.query<{ workspace_id: string; layer: string; status: string; n: number }>(
    `SELECT workspace_id, layer, status, count(*)::int AS n FROM memories GROUP BY 1,2,3`,
  );
}

/** Full, human-readable export of everything JARVIS stores about the owner (no embeddings, no secrets). */
export async function exportAll() {
  const db = await getDb();
  const [workspaces, memories, versions, tasks, conversations, messages] = await Promise.all([
    db.query(`SELECT * FROM workspaces ORDER BY created_at`),
    db.query(`SELECT ${COLS} FROM memories m ORDER BY created_at`),
    db.query(`SELECT * FROM memory_versions ORDER BY memory_id, version`),
    db.query(`SELECT * FROM tasks ORDER BY created_at`),
    db.query(`SELECT * FROM conversations ORDER BY created_at`),
    db.query(`SELECT id, conversation_id, role, content, provider, model, created_at FROM messages ORDER BY created_at`),
  ]);
  return { exported_at: new Date().toISOString(), format: "jarvis-export-v1", workspaces, memories, memory_versions: versions, tasks, conversations, messages };
}

/** Re-embed memories whose vectors come from another embedding model (e.g. after switching to OpenAI embeddings). */
export async function reembedStale(batch = 64): Promise<number> {
  const db = await getDb();
  const embedder = getEmbedder();
  const rows = await db.query<{ id: string; title: string; content: string }>(
    `SELECT id, title, content FROM memories WHERE embedding_model IS DISTINCT FROM $1 LIMIT $2`, [embedder.id, batch],
  );
  if (!rows.length) return 0;
  const vecs = await embedder.embed(rows.map((r) => `${r.title}\n${r.content}`));
  for (let i = 0; i < rows.length; i++) {
    await db.query(`UPDATE memories SET embedding = $2::vector, embedding_model = $3 WHERE id = $1`, [rows[i].id, toPgVector(vecs[i]), embedder.id]);
  }
  return rows.length;
}

export class NotFoundError extends Error {}
