# Changelog

## 0.3.0 – JARVIS speaks (Phase 4 voice) (2026-11-11)

### Added
- **Voice mode** (`/voice`, sidebar "Voice", floating mic button on every page): tap or Space to talk, voice-activity detection (auto-stop after silence), hands-free dialogue loop, barge-in by tap/Space, live transcript, keyboard input with spoken answers, workspace selection; conversations are saved like chats.
- **Voice engine**: server TTS (OpenAI `gpt-4o-mini-tts` with JARVIS voice instructions, ElevenLabs multilingual) and server STT (OpenAI `gpt-4o-transcribe`, German, domain vocabulary) with automatic fallback to the browser's speech APIs; sentence-by-sentence playback with prefetch so JARVIS starts speaking after the first sentence.
- **Spoken commands without AI key**: "Guten Morgen, JARVIS" (spoken briefing), "Merke dir …", "Neue Aufgabe …", "Wie viel kann ich ausgeben?", "Starte Fokus für N Minuten".
- Voice-mode answer style for the AI core (short spoken sentences, no markdown).
- Settings: voice provider, voice, speaking rate, recognition, "Stimme testen"; privacy switches for finance/training data now in the UI.
- Integrations: ElevenLabs connector; OpenAI connector covers voice. Disabling a connector disables its voice use.
- API: `GET /api/voice/config`, `POST /api/voice/tts`, `POST /api/voice/stt` (audio never stored, audit logs size only).
- Tests: 67 unit/integration tests (incl. TTS/STT routes with simulated providers), 38-check browser smoke test including spoken output.

### Fixed
- Briefing risk text "in N Tag(en)" now uses proper German plurals.

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
