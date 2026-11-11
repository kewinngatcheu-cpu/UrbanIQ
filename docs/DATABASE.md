# Database

PostgreSQL 15+ with `pgvector`. Development uses PGlite (embedded) with the same extension. Migrations live in `src/lib/db/migrations.ts`, are append-only and applied automatically on start (`schema_migrations`).

## Tables

| Table | Purpose | Key columns |
|---|---|---|
| `owner` | the single owner (CHECK id = 1) | `display_name`, `password_hash` (scrypt) |
| `sessions` | login sessions per device | `id` = sha256(token), `expires_at`, `last_seen_at`, `device_label` |
| `workspaces` | isolation boundary: `personal` + one per venture | `id` (slug), `kind` (personal/business), `profile` JSONB, `archived` |
| `memories` | long-term memory | `workspace_id`, `layer`, `category`, `title`, `content`, `source`, `source_ref`, `confidence`, `importance` (1–5), `pinned`, `status`, `review_at`, `expires_at`, `shared_with[]`, `superseded_by`, `embedding vector(256)`, `embedding_model`, `version`, `last_used_at` |
| `memory_versions` | immutable history of every content/status change | `memory_id`, `version`, `title`, `content`, `status`, `changed_by`, `reason` |
| `conversations` | chat threads, bound to one workspace | `workspace_id`, `title`, `summary`, `summarized_until` |
| `messages` | chat messages | `role`, `content`, `provider`, `model`, token counts, `metadata` (used memory ids, stop reason) |
| `tasks` | operational tasks | `priority`, `status`, `due_at`, `postponed_count`, `estimate_min`, `completed_at`, `created_by` |
| `audit_log` | every action incl. failures | `actor`, `action`, `target`, `workspace_id`, `level` (autonomy 1–4), `status`, `details` |
| `settings` | key/value owner settings | `key`, `value` JSONB |
| `integrations` | non-secret connector state | `enabled`, `config`, `last_sync`, `last_error` |

Secrets are **never** stored in the database; they come from environment variables.

## Vector search

`embedding <=> query` (cosine distance). Vectors from different embedding models are never compared: every query filters/weights by `embedding_model`. After switching `EMBEDDING_PROVIDER`, `reembedStale()` migrates old vectors. With > ~10k memories add an HNSW index: `CREATE INDEX ON memories USING hnsw (embedding vector_cosine_ops);`.

## Backups

- PGlite: copy `./data/pglite` while the server is stopped, or use the JSON export (`/api/memories/export`).
- Production: managed provider point-in-time recovery + nightly `pg_dump` to encrypted object storage (Phase 4 ops task).
