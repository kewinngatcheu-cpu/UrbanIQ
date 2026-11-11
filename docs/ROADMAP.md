# Roadmap

Legend: ✅ done · 🟡 partial · ⏳ planned

## Phase 1 – Foundation ✅ (v0.1.0)
✅ architecture & docs · ✅ database (PGlite/Postgres + pgvector) · ✅ authentication · ✅ Command Center · ✅ AI chat (Claude/OpenAI abstraction, streaming) · ✅ persistent memory + Memory Center · ✅ tasks · ✅ business workspaces (NGCX, VenturesX, new ventures) · ✅ audit log · ✅ responsive PWA · 🟡 voice preview (browser APIs)

## Phase 2 – Personal Operating System ✅ (v0.2.0)
1. ✅ **My Day**: 10-section daily briefing computed from real data (status, today, top 3, NGCX, VenturesX, decisions, studies, finance, risks, next actions); optional AI wording + read-aloud; evening review with real day stats and optional AI feedback (`daily_reviews`).
2. ✅ Time-block planner ("Ich habe 90 Minuten"): rule-based and explainable; optional AI optimisation validated against real task ids and the time budget; start a focus session from any block.
3. ✅ Goals: metric / milestone / task-based progress (unknown stays unknown), linked tasks, 7-day alignment check.
4. ✅ Discipline: habits with streaks and 30-day consistency (history editable only 7 days back), server-side focus sessions, procrastination root-cause flow (creates a real next-step task).
5. ✅ Personal Finance v1: manual bookings, German bank CSV import (dedupe, latin1), budgets with early warnings, "how much can I spend", 6-month history, scenarios, months-to-goal. No bank connection.
6. 🟡 University: modules, exam dates, study tasks per module, ECTS-weighted grade. Lecture-material analysis (summaries, flashcards) → Phase 3 with document analysis.
7. ✅ Fitness v1: training log, weekly volume, measurements with dates and staleness flag.
8. ✅ Chat context: privacy-filtered `<status>` block (goals, habits, focus, exams, finance if allowed, fitness if allowed); business chats only see their own goals.
- ⏳ Moved on: weekly review screen (data exists via daily reviews) → Phase 3; calendar-aware planning → Phase 7.

## Phase 3 – Business Portfolio ⏳
Venture dashboards (KPIs, pipeline, customers, projects), decision log with versions, roadmap per venture, Research Radar with cited sources, document & spreadsheet analysis, prompt caching.

## Phase 4 – Cross-device & Voice ⏳
Production deployment (HTTPS, managed Postgres, backups, monitoring, 2FA/passkeys), service worker/offline shell, SSE live updates, server-side German STT/TTS adapters with streaming and barge-in, spoken briefings.

## Phase 5 – Multi-agent system ⏳
Executive Agent + specialists, tool calling, permission gate, approval workflow UI, agent run monitoring.

## Phase 6 – Universal Builder ⏳
App & Software Studio with sandboxed build/test/preview loop, game prototypes, deployment preparation.

## Phase 7 – Connected ecosystem ⏳
Google Calendar, Gmail, Drive, Notion, GitHub, CRM/Sheets, content platforms; connector discovery workflow.

## Phase 8 – Advanced JARVIS ⏳
Proactive intelligence (configurable, quiet hours), knowledge graph, predictive insights, native macOS app (wake word), iOS app (HealthKit, Siri).

## Next: Phase 3 – Business Portfolio (priority order)
1. Document & spreadsheet upload + analysis (needed by University and NGCX).
2. NGCX workspace: decision log, roadmap (MVP vs. validated vs. future concept), KPI cards, interview/validation tracker.
3. Research Radar: web search/fetch via Claude server tools with sources + dates.
4. Prompt caching for the stable system prompt.
5. Weekly review (aggregating daily reviews, goals alignment, focus by workspace).

## Known limitations (v0.2.0)
- Finance and planner are rule-based; numbers are exactly reproducible but assume the last months' averages continue.
- CSV categorisation is keyword-based – re-categorise in the list if needed.
- Calendar is not connected, so the planner doesn't know appointments.
- AI answers require an API key (none was available during development; the AI path is covered by tests with a simulated provider, real API calls are verified only by type-checking against the official SDKs).
- Local embeddings are lexical, not semantic – set `EMBEDDING_PROVIDER=openai` for true semantic search.
- No tools for the model yet: JARVIS cannot browse, read files, or act in external systems.
- Rate limiting is per process (fine for single-instance deployment).
- PGlite is single-process: do not run two servers on the same data directory.
