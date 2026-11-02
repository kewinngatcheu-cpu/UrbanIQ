# ONE — Roadmap

Priorities follow the product principles: **quality over feature count, security over speed, user value over gimmicks.**

## Next (v1.2 — production readiness)

- ✅ ~~Stripe billing~~ (Checkout, signed idempotent webhook, customer portal, period-end cancellation) — next: Stripe Tax/VAT, dunning emails, annual plans, churn analytics.
- **Live Supabase rollout**: run the e2e suite against a staging project, Supabase CLI workflow, generated DB types, backups & point-in-time recovery.
- ✅ ~~Password reset & change~~ (revokes other sessions) — next: email change, session list, optional 2FA (TOTP / passkeys), mandatory 2FA for the owner.
- ✅ ~~Transactional email~~ for verification & reset (Resend) — next: receipts and reminder emails.
- ✅ ~~CI pipeline~~ (lint, types, unit, RLS, Stripe webhook, e2e).
- **Distributed rate limiting** (Upstash/Redis) and bot protection (Turnstile) on sign-up.
- **Observability**: Sentry, structured logs, uptime checks; AI cost dashboard in admin.
- **Legal**: GDPR documentation (records of processing, DPA with sub-processors, cookie notice), reviewed privacy policy & terms, Impressum.

## Soon (v1.3 — smarter memory)

- **Semantic search** with pgvector embeddings + hybrid ranking (BM25 + vectors); background embedding jobs.
- ✅ ~~OCR for images & scanned PDFs~~ (Claude vision) — next: **voice-note transcription** via a speech-to-text provider.
- **Streaming AI answers** and follow-up suggestions in chat.
- **Document intelligence**: detect contract end dates, notice periods, amounts and parties; propose actions automatically ("Your gym contract can be cancelled until 15 Nov").
- **Contradiction & gap detection** across documents (e.g. two different policy numbers).
- **Manual linking** between memories, tasks and actions, plus a visual "life graph".
- **Smart inbox**: forward emails to a personal ONE address; share-sheet capture on mobile.

## Later (v2 — ONE everywhere)

- **Mobile apps** (iOS/Android, offline-first) with push reminders and quick capture widgets.
- **Calendar sync** (Google, Apple, Outlook) and **email integration** (read-only first, drafts later — always with explicit confirmation).
- **Automations** (Exclusive): recurring checks such as "remind me 6 weeks before any contract notice deadline".
- **Family / shared spaces** with granular sharing.
- **Internationalisation**: German first, then further languages; locale-aware dates & currencies.
- **Templates marketplace** for actions (cancellation letters per country, complaints, applications).
- **Personal insights**: monthly review, goal progress, spending overview from invoices.
- **Bring-your-own-model / EU-hosted AI** option for privacy-sensitive users.

## Platform & quality

- End-to-end encryption option for selected memories (client-side keys).
- Granular admin roles (support agent vs. owner) with the same consent-based access model.
- Accessibility audit (WCAG 2.2 AA), dark mode, keyboard shortcuts (⌘K command palette).
- Load testing, preview deployments.
