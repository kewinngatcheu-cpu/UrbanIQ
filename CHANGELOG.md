# Changelog

## 0.1.0 – Phase 1: Foundation (2026-11-11)

### Added
- Next.js 16 full-stack app (TypeScript, Tailwind 4), German UI, NGCX colour system, responsive PWA.
- Database layer for PGlite (embedded Postgres + pgvector) and PostgreSQL; append-only migrations.
- Owner setup with one-time token, scrypt passwords, DB-backed sessions, login rate limiting, Origin-based CSRF protection, per-page auth guard + proxy pre-filter.
- Workspaces: Personal, NGCX (IT services / Decision Intelligence), VenturesX (profile pending), unlimited new ventures.
- Memory system: 7 layers, pgvector retrieval, duplicate detection, versioning, status (active/proposed/uncertain/outdated/archived), confidence, importance, review dates, pinning, explicit sharing, JSON export.
- AI core: provider abstraction (Anthropic Claude via official SDK with server-side refusal fallback; OpenAI), streaming chat, workspace-scoped context, memory proposals, rolling summaries.
- Chat commands `/merke`, `/aufgabe`, `/hilfe`.
- Command Center, Chat, Tasks, Memory Center, Business Portfolio + venture pages, Agent Center (activity log), Integrations, Settings, planned-module pages.
- Browser push-to-talk (de-DE) and spoken replies (preview).
- Initial owner knowledge seeded from the brief; obsolete marketing-agency positioning stored as "outdated".
- 28 automated tests + 22-check browser smoke test.
