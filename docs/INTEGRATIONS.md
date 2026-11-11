# Integrations

## Registry

`src/lib/integrations.ts` lists every connector with: name, category, description, supported actions, required permissions/scopes, auth method, required env vars, `implemented` flag, planned phase. The Integrations page derives status from **real state only**:

| Status | Meaning |
|---|---|
| Verbunden | adapter implemented, credentials present, enabled |
| Deaktiviert | implemented + credentials, switched off by the owner |
| Zugangsdaten fehlen | implemented, env vars missing |
| Geplant | no adapter yet – cannot be enabled |
| Fehler | last call failed (`last_error`) |

Implemented today: **Anthropic Claude**, **OpenAI**. Everything else is "planned" and clearly labelled.

## Process for every new integration

1. Identify a real need (owner request or recurring manual work).
2. Research candidates; compare features, official API, pricing, privacy, EU data residency.
3. Recommend one option with reasoning.
4. Owner authorises (OAuth consent with minimal scopes, or API key in env).
5. Implement adapter (`src/lib/integrations/<id>.ts`): typed actions, error mapping, rate limits.
6. Connection test + status reporting.
7. Document actions/permissions in the registry; actions with external side effects require approval (L3).

## Rules

- Official APIs and OAuth only; no scraping of private accounts, no bypassing authentication.
- Least privilege: read-only scopes first; write scopes per action class.
- Tokens stored server-side (encrypted at rest when OAuth lands – see SECURITY), never in the browser.
- Each connector can be disabled individually; disabling stops all use immediately.
- No bank connections without explicit authorisation; JARVIS never executes financial transactions without confirmation.

## Planned order

Phase 3: web search/news API (Research Radar). Phase 7: Google Calendar → Gmail (read + drafts) → Google Drive → Notion → GitHub (Phase 6 builder) → CRM/Sheets. Apple Health requires a native iOS app (HealthKit).
