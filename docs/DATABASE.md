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

### Phase 2 tables (`0002_personal_os`)

| Table | Purpose | Key columns |
|---|---|---|
| `goals` | goals per workspace | `category`, `horizon`, `target_date`, `status`, `metric_unit/start/target/current` |
| `milestones` | goal milestones | `goal_id`, `due_date`, `done_at`, `position` |
| `courses` | HWR modules | `semester`, `ects`, `exam_date`, `status`, `grade` (1.0–5.0) |
| `habits` / `habit_checkins` | habits and one row per done day | `target_per_week`; PK (`habit_id`, `day`) |
| `focus_sessions` | server-side focus timer | `task_id`, `workspace_id`, `planned_min`, `started_at`, `ended_at`, `actual_min`, `completed` |
| `daily_reviews` | one row per Berlin day | `briefing` (snapshot), `briefing_ai`, `plan`, `evening` (answers + stats), `ai_feedback` |
| `finance_transactions` | bookings | `amount_cents` (income > 0, outflow < 0), `kind`, `category`, `source` (manual/csv), `import_hash` (unique, dedupe) |
| `finance_budgets` | monthly budget per category | `monthly_cents` |
| `fitness_workouts` / `body_measurements` | training log and dated measurements | `type`, `duration_min`, `intensity` / `metric`, `value` |

`tasks` gained `goal_id`, `course_id`, `blocker_reason`, `parent_id`. Money is stored as integer cents; "today" is always the Europe/Berlin calendar day.

Secrets are **never** stored in the database; they come from environment variables.

## Vector search

`embedding <=> query` (cosine distance). Vectors from different embedding models are never compared: every query filters/weights by `embedding_model`. After switching `EMBEDDING_PROVIDER`, `reembedStale()` migrates old vectors. With > ~10k memories add an HNSW index: `CREATE INDEX ON memories USING hnsw (embedding vector_cosine_ops);`.

## Backups

- PGlite: copy `./data/pglite` while the server is stopped, or use the JSON export (`/api/memories/export`).
- Production: managed provider point-in-time recovery + nightly `pg_dump` to encrypted object storage (Phase 4 ops task).
