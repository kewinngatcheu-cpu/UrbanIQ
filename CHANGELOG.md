# Changelog

## 0.2.0 – Phase 2: Personal Operating System (2026-11-11)

### Added
- Migration `0002_personal_os`: goals, milestones, courses, habits, habit check-ins, focus sessions, daily reviews, finance transactions/budgets, workouts, body measurements; tasks gain goal, course, blocker reason and parent links.
- **My Day**: rule-based 10-section briefing (status, today, top 3, NGCX, VenturesX, open decisions, studies, finance, risks, next actions), optional AI wording + read-aloud, time-block planner (rules or validated AI), evening review with real day stats and optional AI feedback.
- **Goals** with metric/milestone/task progress and a 7-day alignment check.
- **Discipline**: habits (streak, weekly target, 30-day consistency, 7-day edit window), server-side focus sessions, procrastination root-cause flow with real next-step tasks.
- **Personal Finance**: manual bookings, German bank CSV import (preview, dedupe, latin1, debit/credit columns, keyword categories), budgets with early warnings, "how much can I spend", 6-month history, scenario simulation, months-to-goal, manual balances.
- **Fitness**: workouts, weekly volume, measurements with staleness flag. **University**: modules, exam dates, per-module tasks, ECTS-weighted grade.
- Command Center strip (habits, focus, money left, next exam) + risk list.
- Chat: privacy-filtered `<status>` block; business chats only receive their own goals.
- Settings: `aiContextFinance` (default on), `aiContextHealth` (default off), balances, day window; settings are validated per key.
- Tests: 50 unit/integration tests, 33-check browser smoke test.

### Changed
- Task create/edit supports time estimates, goals and courses; "Gestern fehlt das Abend-Review" only after the review habit has started.

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
