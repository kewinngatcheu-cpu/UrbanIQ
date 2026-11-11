# Security & privacy

JARVIS holds personal, financial-adjacent and business data. Security is designed in from Phase 1.

## Implemented controls (Phase 1)

| Control | Implementation |
|---|---|
| Owner setup | one owner only (DB constraint); creation requires `JARVIS_SETUP_TOKEN` (constant-time compare, rate-limited) so a fresh deployment cannot be claimed by strangers |
| Passwords | scrypt (N=2¹⁵, r=8, p=1), min. 12 chars with letters + digits |
| Sessions | 32-byte random token in an httpOnly, SameSite=Lax cookie (`Secure` with `JARVIS_SECURE_COOKIES=true`); only sha256(token) stored; 30-day expiry; logout deletes the session; active sessions listed in Settings |
| Page protection | `proxy.ts` cookie pre-filter + `requireOwner()` in **every** protected page (layouts render in parallel with pages, so a layout-only check is insufficient). Enforced by `tests/security.test.ts` |
| API protection | every route wrapped in `api()`: session validation, Origin/Host check on mutations (CSRF), zod validation, uniform errors, body size limits |
| Rate limiting | login 8/15 min, setup 5/15 min, chat 30/min per IP (in-process; single instance) |
| Secrets | only in environment variables, read server-side; never in DB, logs or client bundles (test asserts no client file references them) |
| Headers | X-Frame-Options DENY, nosniff, strict referrer, restrictive Permissions-Policy, no `x-powered-by` |
| Output safety | chat markdown renderer never injects HTML; links restricted to http(s) |
| Prompt injection | memories/tasks/profile are passed inside data blocks declared as non-instructions; the model has **no tools** in Phase 1, so injected text cannot trigger actions |
| Workspace isolation | single SQL scope predicate; cross-workspace access only via explicit `shared_with` (audited as `memory.share`) |
| Audit | every state change and every AI response (incl. failures) in `audit_log` with actor, autonomy level and status; visible in Agent Center |
| Data control | edit/delete any memory, delete conversations, full JSON export |
| Honesty | no fake integrations; providers missing → explicit error; planned modules labelled |

## Autonomy levels

| Level | Meaning | Phase 1 usage |
|---|---|---|
| L1 Read | analyse authorised data | chat answers |
| L2 Prepare | drafts, plans, proposals | memory proposals (need approval in `suggest` mode) |
| L3 Execute with approval | action after explicit owner confirmation | owner commands/edits |
| L4 Limited autonomy | pre-authorised, low-risk, reversible tasks | not enabled |

Always requiring explicit confirmation: sending email, publishing content, purchases, financial transactions, sharing personal data, deleting important data, changing permissions, irreversible external actions.

## Data flows to third parties

- Chat: the message, the retrieved memories, open tasks of the workspace, the workspace profile and a computed `<status>` block are sent to the selected AI provider. Nothing else.
- `<status>` in the **personal** workspace: active goals, habits today, focus minutes, upcoming exams; finance summary only if `aiContextFinance` is on (default on); training data only if `aiContextHealth` is on (default off). In **business** workspaces: only that workspace's goals – personal data never enters business chats (tested).
- AI briefing / evening feedback: the same privacy filter applies (`briefingForAI`).
- Finance: no bank connection. CSV files are parsed in memory; only resulting bookings are stored. No transactions are ever executed.
- Embeddings: only with `EMBEDDING_PROVIDER=openai` (memory texts go to OpenAI). Default is local.
- Browser voice: speech may be processed by the browser vendor.
- Server voice: text to be spoken goes to the TTS provider (OpenAI/ElevenLabs); recordings go to the STT provider (OpenAI) for transcription only and are not stored by JARVIS. Audit entries contain provider and size, never content. Voice routes require a session, are rate-limited (TTS 120/min, STT 40/min), size-limited (text 4,000 chars, audio 10 MB) and type-checked (audio/* only).

## Open items (planned)

- Phase 4 (before public hosting): HTTPS-only deployment, `JARVIS_SECURE_COOKIES=true`, encrypted nightly backups, error monitoring, optional passkey/WebAuthn and TOTP 2FA, session revocation per device, CSP header with nonces.
- Phase 5: tool permission gate + approval workflow; per-agent scopes.
- Phase 6: sandboxed code execution (see SOFTWARE_BUILDER).
- Phase 7: OAuth token encryption at rest (envelope encryption with a key from the environment/KMS).
- Privacy note: `src/lib/seed/ownerProfile.ts` contains personal profile facts from the brief; keep the repository private or replace it with a git-ignored local file.
