/**
 * Ordered, append-only SQL migrations. Never edit an applied migration – add a new one.
 * Works identically on PGlite (dev/test) and PostgreSQL + pgvector (production).
 */
export const EMBEDDING_DIMS = 256;

export const migrations: { id: string; sql: string }[] = [
  {
    id: "0001_foundation",
    sql: /* sql */ `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE owner (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- single-owner system
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,               -- sha256(token); raw token only lives in the cookie
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  user_agent   TEXT,
  device_label TEXT
);

CREATE TABLE workspaces (
  id          TEXT PRIMARY KEY,                 -- slug: personal, ngcx, venturesx, ...
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('personal','business')),
  description TEXT NOT NULL DEFAULT '',
  profile     JSONB NOT NULL DEFAULT '{}'::jsonb, -- business profile: market, product, principles, phase ...
  color       TEXT NOT NULL DEFAULT '#1677FF',
  archived    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  layer           TEXT NOT NULL CHECK (layer IN ('identity','personal','business','project','conversational','strategic','operational')),
  category        TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'user',     -- user | conversation | seed | import | system
  source_ref      TEXT,                              -- e.g. message id
  confidence      REAL NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  importance      SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  pinned          BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','proposed','uncertain','outdated','archived')),
  review_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  shared_with     TEXT[] NOT NULL DEFAULT '{}',      -- explicit cross-workspace sharing
  superseded_by   UUID REFERENCES memories(id) ON DELETE SET NULL,
  embedding       vector(${EMBEDDING_DIMS}),
  embedding_model TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX memories_ws_idx ON memories (workspace_id, status);
CREATE INDEX memories_layer_idx ON memories (layer);

CREATE TABLE memory_versions (
  id          BIGSERIAL PRIMARY KEY,
  memory_id   UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL,
  changed_by  TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX memory_versions_mem_idx ON memory_versions (memory_id, version);

CREATE TABLE conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title              TEXT NOT NULL DEFAULT 'Neue Unterhaltung',
  summary            TEXT,
  summarized_until   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  provider        TEXT,
  model           TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON messages (conversation_id, created_at);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  project         TEXT,
  due_at          TIMESTAMPTZ,
  postponed_count INTEGER NOT NULL DEFAULT 0,
  estimate_min    INTEGER,
  completed_at    TIMESTAMPTZ,
  created_by      TEXT NOT NULL DEFAULT 'owner',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tasks_ws_status_idx ON tasks (workspace_id, status, due_at);

CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor        TEXT NOT NULL,             -- owner | jarvis | agent:<name> | system
  action       TEXT NOT NULL,             -- e.g. memory.create, task.update, auth.login
  target       TEXT,
  workspace_id TEXT,
  level        SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4), -- autonomy level
  status       TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded','failed','pending_approval','rejected')),
  details      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_at_idx ON audit_log (at DESC);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integrations (
  id         TEXT PRIMARY KEY,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  config     JSONB NOT NULL DEFAULT '{}'::jsonb, -- non-secret config only
  last_sync  TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`,
  },
];
