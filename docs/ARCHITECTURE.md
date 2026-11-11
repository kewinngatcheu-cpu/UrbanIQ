# Architecture

## 1. Technical assessment (answers to the brief's 12 questions)

| # | Question | Decision |
|---|---|---|
| 1 | Architecture | **Modular monolith**: one Next.js (App Router) application serving UI + REST API, with domain modules in `src/lib/*` (memory, ai, tasks, workspaces, integrations, audit). One deployable, one database. Workers (agents, builder sandboxes) are added as separate processes only when Phase 5/6 need them. |
| 2 | Personal vs. business memory | Every record carries a `workspace_id`. Retrieval is scoped by one SQL predicate (`scopeSql`): own workspace + the owner's identity layer + explicitly shared items. Nothing else crosses boundaries. Tested in `tests/memory.test.ts`. |
| 3 | Multiple ventures | Ventures are rows in `workspaces` (kind `business`) with a free-form JSON `profile`. New ventures need no schema change. |
| 4 | Integrations | Connector registry (`src/lib/integrations.ts`) with an adapter per service, status derived from real state, per-connector enable switch, least-privilege scopes, OAuth where available. |
| 5 | Voice | Today: browser Web Speech APIs (push-to-talk, TTS) as a preview. Target: server-side STT/TTS provider adapters with streaming audio (see VOICE_SYSTEM). |
| 6 | Apple devices sync | One backend + one database = one state. PWA on Mac/iPad/iPhone. Clients re-fetch on navigation; real-time push (SSE) for agent jobs in Phase 4/5. Native apps only where a platform API requires it (HealthKit, background wake word). |
| 7 | Creating apps & games | App & Software Studio (Phase 6): spec → plan → code generation → build/test loop inside an isolated sandbox → preview URL → approval before any deployment. See SOFTWARE_BUILDER. |
| 8 | Isolated code execution | Per-project container (Docker/gVisor or a managed sandbox) with no access to JARVIS secrets or the host FS, CPU/memory/time limits, egress allowlist. Never inside the JARVIS server process. |
| 9 | Agent orchestration | Executive agent = tool-calling loop over the Claude API; specialists are configurations (prompt + tool subset + permission level + memory scope), not separate services. Every tool call passes a server-side permission gate and is written to `audit_log`. |
| 10 | Security | See SECURITY: single owner auth, server-side keys, CSRF/Origin checks, rate limits, workspace isolation, data-vs-instruction separation in prompts, autonomy levels, full audit trail. |
| 11 | Infrastructure | Local: `npm run dev` with embedded PGlite. Production: one small VM or container host (Fly.io / Hetzner / Render) behind HTTPS + managed PostgreSQL with pgvector (Neon, Supabase, RDS) + daily backups. |
| 12 | Recurring costs | See §5. |

### Why TypeScript end-to-end instead of Next.js + FastAPI

The brief proposed a Python/FastAPI backend. For a single-owner system a second service doubles deployment, auth and type-sharing work without a capability gain: the official Anthropic and OpenAI SDKs, pgvector and streaming are first-class in TypeScript. If Python becomes necessary (data science notebooks, specific ML libraries), it will be added as a **worker** behind a queue, not as the primary API.

### Why PGlite for development

The development machine had PostgreSQL 16 without pgvector. Instead of requiring system installs, JARVIS uses PGlite (Postgres compiled to WASM) **with the official pgvector extension**. It is the same SQL dialect as production; migrations and queries run unchanged on both. PGlite is single-process – production must use `DATABASE_URL`.

## 2. System overview

```
 Browser / PWA (Mac · iPad · iPhone)
   │  HTTPS, session cookie (httpOnly, SameSite=Lax)
   ▼
 Next.js server ───────────────────────────────────────────────
   proxy.ts            cookie pre-filter for pages
   app/(app)/*         server-rendered pages, each calls requireOwner()
   app/api/*           REST + NDJSON streaming, wrapped by api(): auth, Origin check, errors
   lib/ai              chat orchestration, providers (Claude/OpenAI), commands, memory extraction
   lib/memory          memory service, embeddings (local hash | OpenAI)
   lib/tasks, workspaces, settings, integrations, audit
   │
   ▼
 PostgreSQL + pgvector  (PGlite in dev / managed Postgres in prod)
   │
   └─ outbound: api.anthropic.com, api.openai.com (only when keys are set & connector enabled)
```

## 3. Folder structure

```
src/
  app/
    (app)/            protected pages: / (Command Center), chat, tasks, memory, business, agents, integrations, settings, modules/[slug]
    api/              auth/*, chat, conversations, memories, tasks, workspaces, settings, integrations, audit, health
    login/, setup/    public auth pages
  components/         Sidebar, JarvisCore (state visualisation), Markdown (XSS-safe), TasksClient, …
  lib/
    db/               driver selection + migrations
    auth/             password (scrypt), session, guard, rate limit
    ai/               chat.ts, systemPrompt.ts, commands.ts, memoryExtraction.ts, registry.ts, providers/*
    memory/           service.ts, embeddings.ts
    seed/             owner profile seed (initial knowledge from the brief)
    nav.ts            navigation + module build status
  proxy.ts
tests/                vitest (in-memory Postgres): memory, core, chat-ai (simulated provider), security invariants
scripts/              setup.ts (env + token), smoke.mjs (browser E2E)
docs/
```

## 4. API architecture

All routes are JSON, authenticated by session cookie, Origin-checked for mutations, validated with zod.

| Method & path | Purpose |
|---|---|
| `POST /api/auth/setup` | one-time owner creation (needs `JARVIS_SETUP_TOKEN`) |
| `POST /api/auth/login`, `POST /api/auth/logout` | session handling |
| `POST /api/chat` | NDJSON stream of `conversation · context · delta · action · done · memory_proposals · error` events |
| `GET /api/conversations?workspace=` · `GET/PATCH/DELETE /api/conversations/:id` | history |
| `GET /api/memories?q&workspace&layer&status&pinned` · `POST /api/memories` | search / create (409 on duplicate) |
| `GET/PATCH/DELETE /api/memories/:id` | detail incl. version history / update / delete |
| `GET /api/memories/export` | full JSON export |
| `GET/POST /api/tasks` · `PATCH/DELETE /api/tasks/:id` | tasks |
| `GET/POST /api/workspaces` · `PATCH /api/workspaces/:id` | ventures |
| `GET/PATCH /api/settings` | settings + provider status |
| `GET /api/integrations` · `PATCH /api/integrations/:id` | connector status / enable |
| `GET /api/audit` | activity log |
| `GET /api/health` | liveness (no personal data) |

## 5. Expected recurring costs (estimates, Nov 2026 list prices)

| Item | Assumption | Monthly |
|---|---|---|
| Claude Opus 5.5 ($4 / $20 per MTok) | 30 chat turns/day × (~6k input + ~600 output) + memory extraction (~2k in / 200 out, low effort) | ≈ $35–45 |
| …same with Claude Sonnet 5.5 ($2 / $10) | switchable in Settings | ≈ $18–23 |
| OpenAI embeddings (optional) | text-embedding-3-small | < $1 |
| App hosting | 1 small VM/container | €5–15 |
| Managed Postgres + pgvector | small tier incl. backups | €0–25 |
| **Total** | moderate daily use | **≈ €45–90** |

Main cost lever later: prompt caching of the stable system prompt and memory block, and lower effort for routine questions. Builder (Phase 6) sandboxes add usage-based compute.
