# Memory architecture

Goal: JARVIS should not need the same context twice – but it must never claim to remember what is not stored, and it must not silently overwrite important facts.

## Layers (`memories.layer`)

| Layer | Content | Typical workspace |
|---|---|---|
| `identity` | who Kewin is, language, communication preferences, devices | personal (globally visible) |
| `personal` | routines, responsibilities, lifestyle, private projects | personal |
| `business` | per-venture knowledge base (positioning, customers, pricing…) | ngcx, venturesx, … |
| `project` | objectives, requirements, status, lessons per project | any |
| `conversational` | facts learned in conversations (+ rolling summaries per conversation) | any |
| `strategic` | ambitions, strategies, decisions, financial goals | any |
| `operational` | reminders, recurring responsibilities, pending actions | any |

Every memory has: category, created/updated dates, source (+ reference), confidence, importance, status, optional review/expiry date, version.

## Life cycle

```
 conversation ──► extraction (LLM, structured output) ──► status=proposed ──► owner approves ──► active
 /merke, Memory Center ─────────────────────────────────────────────────────────────────────────► active
 correction detected ──► new entry status=uncertain + note "possible correction of …" (never overwrite)
 edit ──► new row in memory_versions (title/content/status changes)
 review_at passed ──► flagged "Überprüfung fällig" in UI and prompt
 owner marks outdated/archived ──► excluded from AI context, kept for history
```

Modes (Settings → "Automatisches Merken"): `off`, `suggest` (default – nothing enters the context without approval), `auto` (high-confidence facts stored directly; corrections still `uncertain`).

## Duplicate & conflict handling

- On create, the nearest memories in the same workspace (same embedding model) are fetched.
- cosine ≥ 0.92 → **duplicate**, not stored (409 / chat message), unless explicitly forced.
- cosine ≥ 0.60 → returned as **related** so the owner can check for contradictions.

## Retrieval for the AI core

`retrieveContext(workspace, query)`:
1. Scope: own workspace ∪ owner identity layer ∪ memories whose `shared_with` contains the workspace.
2. Status `active` or `uncertain`, not expired.
3. Score = 0.7·similarity + 0.2·importance/5 + 0.15·pinned; top 10.
4. Pinned identity facts are always included.
5. `last_used_at` is updated (shows what JARVIS actually used).

The prompt lists each memory with layer, category, status, confidence and date, inside a `<gedaechtnis>` block that is declared as data, not instructions. The UI shows which memories were used for each answer.

## Embeddings

- `local-hash-v1` (default, offline): feature hashing over words, bigrams and character trigrams. Lexical and typo-tolerant, not truly semantic (weak on synonyms). Honestly labelled.
- `openai:text-embedding-3-small@256`: real semantic embeddings, enabled with `EMBEDDING_PROVIDER=openai`. Memory text is then sent to OpenAI.

## Conversation memory

The last 20 messages go verbatim to the model; once more than 30 are unsummarised, older ones are condensed into `conversations.summary` (decisions, facts, open questions, next steps).

## Owner control

Memory Center: semantic search, filters, edit, pin, status changes, explicit sharing, delete (incl. history), version history, approve/reject proposals, JSON export of everything (no embeddings).

## Planned (Phase 3/8)

Knowledge graph links between memories/projects/people, scheduled review prompts, document-derived memories with page citations.
