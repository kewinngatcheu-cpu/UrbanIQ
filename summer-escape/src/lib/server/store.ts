import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Persistence layer. Two interchangeable backends:
 *  - SupabaseStore (production): PostgreSQL via the service-role key, server-side only.
 *  - FileStore (local development): JSON file in ./.data – never for production.
 *  - MemoryStore (tests).
 * Answers are passed in already encrypted (see crypto.ts) – the store never sees plain text.
 */

export type Phase = "setup" | "live";
export type ParticipantId = "joanna" | "kewin";
export const PARTICIPANTS: { id: ParticipantId; name: string }[] = [
  { id: "joanna", name: "Joanna" },
  { id: "kewin", name: "Kewin" },
];

export interface ParticipantRow {
  id: ParticipantId;
  name: string;
  tokenHash: string | null;
  tokenCreatedAt: string | null;
}

export interface ResponseRow {
  participantId: ParticipantId;
  payload: string; // encrypted JSON
  status: "draft" | "submitted";
  updatedAt: string;
  submittedAt: string | null;
}

export interface Settings {
  phase: Phase;
  startedAt: string | null;
}

export interface Store {
  readonly kind: "supabase" | "file" | "memory";
  getSettings(): Promise<Settings>;
  setPhase(phase: Phase): Promise<void>;
  listParticipants(): Promise<ParticipantRow[]>;
  findParticipantByTokenHash(hash: string): Promise<ParticipantRow | null>;
  setTokenHash(id: ParticipantId, hash: string): Promise<void>;
  getResponse(id: ParticipantId): Promise<ResponseRow | null>;
  /** Returns false if the response is already submitted (locked). */
  saveDraft(id: ParticipantId, payload: string): Promise<boolean>;
  /** Returns false if already submitted. */
  submit(id: ParticipantId, payload: string): Promise<boolean>;
  deleteAllResponses(): Promise<void>;
}

/* ───────────────────────── in-memory / file ───────────────────────── */

interface Snapshot {
  settings: Settings;
  participants: ParticipantRow[];
  responses: ResponseRow[];
}

function emptySnapshot(): Snapshot {
  return {
    settings: { phase: "setup", startedAt: null },
    participants: PARTICIPANTS.map((p) => ({ id: p.id, name: p.name, tokenHash: null, tokenCreatedAt: null })),
    responses: [],
  };
}

export class MemoryStore implements Store {
  readonly kind: "memory" | "file" = "memory";
  protected snap: Snapshot = emptySnapshot();
  protected async load(): Promise<Snapshot> {
    return this.snap;
  }
  protected async persist(): Promise<void> {}
  private queue: Promise<unknown> = Promise.resolve();
  /** Serialise mutations to keep read-modify-write consistent. */
  protected mutate<T>(fn: (s: Snapshot) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const s = await this.load();
      const r = fn(s);
      await this.persist();
      return r;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
  async getSettings() {
    return { ...(await this.load()).settings };
  }
  async setPhase(phase: Phase) {
    await this.mutate((s) => {
      s.settings.phase = phase;
      if (phase === "live" && !s.settings.startedAt) s.settings.startedAt = new Date().toISOString();
      if (phase === "setup") s.settings.startedAt = null;
    });
  }
  async listParticipants() {
    return (await this.load()).participants.map((p) => ({ ...p }));
  }
  async findParticipantByTokenHash(hash: string) {
    const p = (await this.load()).participants.find((x) => x.tokenHash === hash);
    return p ? { ...p } : null;
  }
  async setTokenHash(id: ParticipantId, hash: string) {
    await this.mutate((s) => {
      const p = s.participants.find((x) => x.id === id);
      if (p) {
        p.tokenHash = hash;
        p.tokenCreatedAt = new Date().toISOString();
      }
    });
  }
  async getResponse(id: ParticipantId) {
    const r = (await this.load()).responses.find((x) => x.participantId === id);
    return r ? { ...r } : null;
  }
  async saveDraft(id: ParticipantId, payload: string) {
    return this.mutate((s) => {
      const now = new Date().toISOString();
      const r = s.responses.find((x) => x.participantId === id);
      if (r?.status === "submitted") return false;
      if (r) {
        r.payload = payload;
        r.updatedAt = now;
      } else s.responses.push({ participantId: id, payload, status: "draft", updatedAt: now, submittedAt: null });
      return true;
    });
  }
  async submit(id: ParticipantId, payload: string) {
    return this.mutate((s) => {
      const now = new Date().toISOString();
      const r = s.responses.find((x) => x.participantId === id);
      if (r?.status === "submitted") return false;
      if (r) Object.assign(r, { payload, status: "submitted", updatedAt: now, submittedAt: now });
      else s.responses.push({ participantId: id, payload, status: "submitted", updatedAt: now, submittedAt: now });
      return true;
    });
  }
  async deleteAllResponses() {
    await this.mutate((s) => {
      s.responses = [];
    });
  }
}

export class FileStore extends MemoryStore {
  readonly kind = "file" as const;
  constructor(private file: string) {
    super();
  }
  /** Always re-read: route handlers and pages may run in separate module instances. */
  protected async load(): Promise<Snapshot> {
    try {
      this.snap = { ...emptySnapshot(), ...JSON.parse(await fs.readFile(this.file, "utf8")) };
    } catch {
      this.snap = emptySnapshot();
    }
    return this.snap;
  }
  protected async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.snap, null, 2), { mode: 0o600 });
    await fs.rename(tmp, this.file);
  }
}

/* ───────────────────────── Supabase ───────────────────────── */

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private db: SupabaseClient;
  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  private check<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error(`Supabase: ${res.error.message}`);
    return res.data;
  }
  async getSettings(): Promise<Settings> {
    const row = this.check(await this.db.from("settings").select("phase, started_at").eq("id", 1).maybeSingle());
    return row ? { phase: row.phase as Phase, startedAt: row.started_at } : { phase: "setup", startedAt: null };
  }
  async setPhase(phase: Phase) {
    const current = await this.getSettings();
    const startedAt = phase === "live" ? (current.startedAt ?? new Date().toISOString()) : null;
    this.check(await this.db.from("settings").upsert({ id: 1, phase, started_at: startedAt }));
  }
  private mapP(r: { id: string; display_name: string; token_hash: string | null; token_created_at: string | null }): ParticipantRow {
    return { id: r.id as ParticipantId, name: r.display_name, tokenHash: r.token_hash, tokenCreatedAt: r.token_created_at };
  }
  async listParticipants() {
    const rows = this.check(await this.db.from("participants").select("id, display_name, token_hash, token_created_at").order("id"));
    const byId = new Map((rows ?? []).map((r) => [r.id, this.mapP(r)]));
    return PARTICIPANTS.map((p) => byId.get(p.id) ?? { id: p.id, name: p.name, tokenHash: null, tokenCreatedAt: null });
  }
  async findParticipantByTokenHash(hash: string) {
    const row = this.check(
      await this.db.from("participants").select("id, display_name, token_hash, token_created_at").eq("token_hash", hash).maybeSingle(),
    );
    return row ? this.mapP(row) : null;
  }
  async setTokenHash(id: ParticipantId, hash: string) {
    const name = PARTICIPANTS.find((p) => p.id === id)?.name ?? id;
    this.check(
      await this.db.from("participants").upsert({ id, display_name: name, token_hash: hash, token_created_at: new Date().toISOString() }),
    );
  }
  private mapR(r: { participant_id: string; payload: string; status: string; updated_at: string; submitted_at: string | null }): ResponseRow {
    return {
      participantId: r.participant_id as ParticipantId,
      payload: r.payload,
      status: r.status as ResponseRow["status"],
      updatedAt: r.updated_at,
      submittedAt: r.submitted_at,
    };
  }
  async getResponse(id: ParticipantId) {
    const row = this.check(
      await this.db.from("responses").select("participant_id, payload, status, updated_at, submitted_at").eq("participant_id", id).maybeSingle(),
    );
    return row ? this.mapR(row) : null;
  }
  async saveDraft(id: ParticipantId, payload: string) {
    const existing = await this.getResponse(id);
    if (existing?.status === "submitted") return false;
    const now = new Date().toISOString();
    if (existing) {
      // Conditional update: never overwrite a submitted response.
      const rows = this.check(
        await this.db.from("responses").update({ payload, updated_at: now }).eq("participant_id", id).eq("status", "draft").select("participant_id"),
      );
      return (rows ?? []).length > 0;
    }
    const ins = await this.db.from("responses").insert({ participant_id: id, payload, status: "draft", updated_at: now });
    if (ins.error) return false;
    return true;
  }
  async submit(id: ParticipantId, payload: string) {
    const existing = await this.getResponse(id);
    if (existing?.status === "submitted") return false;
    const now = new Date().toISOString();
    if (existing) {
      const rows = this.check(
        await this.db
          .from("responses")
          .update({ payload, status: "submitted", updated_at: now, submitted_at: now })
          .eq("participant_id", id)
          .eq("status", "draft")
          .select("participant_id"),
      );
      return (rows ?? []).length > 0;
    }
    const ins = await this.db.from("responses").insert({ participant_id: id, payload, status: "submitted", updated_at: now, submitted_at: now });
    return !ins.error;
  }
  async deleteAllResponses() {
    this.check(await this.db.from("responses").delete().in("participant_id", PARTICIPANTS.map((p) => p.id)));
  }
}

/* ───────────────────────── factory ───────────────────────── */

let instance: Store | null = null;

export function getStore(): Store {
  if (instance) return instance;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) instance = new SupabaseStore(url, key);
  else {
    // Serverless hosts only allow writes to /tmp (ephemeral!) – see isEphemeralStorage().
    const dir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/summer-escape" : path.join(process.cwd(), ".data"));
    instance = new FileStore(path.join(dir, "store.json"));
  }
  return instance;
}

/** Tests only. */
export function _setStore(s: Store | null) {
  instance = s;
}

/** True when data would not survive a redeploy (file store on a serverless host). */
export function isEphemeralStorage(): boolean {
  return getStore().kind !== "supabase" && (process.env.VERCEL === "1" || process.env.NODE_ENV === "production");
}
