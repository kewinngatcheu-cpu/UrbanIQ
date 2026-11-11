# Roadmap

Legend: ✅ done · 🟡 partial · ⏳ planned

## Phase 1 – Foundation ✅ (v0.1.0)
✅ architecture & docs · ✅ database (PGlite/Postgres + pgvector) · ✅ authentication · ✅ Command Center · ✅ AI chat (Claude/OpenAI abstraction, streaming) · ✅ persistent memory + Memory Center · ✅ tasks · ✅ business workspaces (NGCX, VenturesX, new ventures) · ✅ audit log · ✅ responsive PWA · 🟡 voice preview (browser APIs)

## Phase 2 – Personal Operating System ⏳ (next)
1. **My Day**: morning briefing (structured: priorities, schedule, NGCX/VenturesX status, university, risks, next action) + evening review (done/not done/why/learned/tomorrow) – stored as `daily_reviews`.
2. AI planner tool: "organise my day", "I have 90 minutes" → structured plan with time blocks written to tasks (approval).
3. Goals with milestones linked to tasks; weekly review.
4. Discipline: habits, focus sessions, procrastination pattern detection (postponed ≥3× → root-cause dialogue).
5. Personal Finance v1: manual entries + CSV import, budgets, cash-flow forecast, scenarios. No bank connection.
6. University workspace: courses, deadlines, document upload → summaries/flashcards (lecture material first).
7. Fitness v1: training log, measurements with dates.

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

## Known limitations of v0.1.0
- AI answers require an API key (none was available during development; the AI path is covered by tests with a simulated provider, real API calls are verified only by type-checking against the official SDKs).
- Local embeddings are lexical, not semantic – set `EMBEDDING_PROVIDER=openai` for true semantic search.
- No tools for the model yet: JARVIS cannot browse, read files, or act in external systems.
- Rate limiting is per process (fine for single-instance deployment).
- PGlite is single-process: do not run two servers on the same data directory.
