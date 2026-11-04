# ONE — Your Life. Your Business. One Intelligent System.

ONE is one platform with **two separate product worlds** and one platform administration:

| | |
| --- | --- |
| **ONE Personal** | „Your personal life, organized.“ — Memory, Action, Life, Intelligence for private individuals. Plans: Free 0 € · Premium 14,99 € · Exclusive 29,99 € per month. |
| **ONE Business** | „Your business, under control.“ — company workspace with dashboard, tasks & sub-tasks, projects, company memory & clients, business actions, business intelligence, team with roles (Owner, Admin, Manager, Employee, Viewer) and invitations. Plans: Starter · Growth · Scale — **prices are set by the owner in admin** (none are invented in code). |
| **ONE Admin** | Owner-only platform management: users, businesses, subscriptions, plans & prices, analytics, requests, product flags, settings, security (TOTP), audit log. |

📐 Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · ✅ What is done vs. prepared: [FEATURES.md](FEATURES.md) · 🗺️ [ROADMAP.md](ROADMAP.md)

## 🇩🇪 Schnellstart auf deinem Mac (5 Minuten)

Voraussetzung: **Node.js 20.9 oder neuer** (prüfen mit `node -v`, sonst von [nodejs.org](https://nodejs.org) die LTS-Version installieren).

```bash
git clone https://github.com/kewinngatcheu-cpu/UrbanIQ.git ONE
cd ONE
git checkout claude/one-life-os-build-m56oq9
npm install
npm run setup      # fragt nach deiner E-Mail und einem Passwort → das wird dein Admin-Konto
npm run dev
```

Dann im Browser **http://localhost:3000** öffnen und mit deiner E-Mail anmelden. Du landest direkt im Admin-Bereich (ONE ADMIN); über „Mein persönliches ONE“ nutzt du die App selbst. Sprache oben über **DE / EN** umschalten.

- **Business testen:** abmelden → „Registrieren“ → **ONE Business** wählen → Firmenname, E-Mail, Passwort → Bestätigungslink → Firmenbereich einrichten. Teammitglieder lädst du unter **Team** ein (ohne Mailserver zeigt ONE dir den Einladungslink zum Kopieren).
- **Business-Preise festlegen:** im Admin unter **Tarife & Preise** (solange kein Preis gesetzt ist, steht dort „Preis folgt“ und der Tarif ist nicht buchbar).
- **Zwei-Faktor-Schutz für den Admin:** Admin → **Sicherheit** → einrichten (Authenticator-App).

- Beenden: im Terminal `Ctrl + C`. Wieder starten: `cd ONE && npm run dev`.
- Deine Daten liegen lokal im Ordner `.data/` (nur auf deinem Mac).
- Neue Test-Nutzer registrieren sich ganz normal; den Bestätigungslink zeigt ONE im lokalen Modus direkt auf der Seite an.
- Für echten Betrieb im Internet (mit Supabase, Stripe, E-Mail und KI) siehe die Abschnitte unten.

**ONE Personal** combines a **private personal memory** with a **personal AI assistant** that turns information into concrete next steps. It is organised in four modules:

| Module | What it does |
| --- | --- |
| **Memory** | Notes, ideas, important information, goals, documents (PDF/text/images/voice), tags, categories, search, previews, summaries, related items |
| **Action** | Cancellations, complaints, invoices, moves, emails, appointments — ONE prepares steps, drafts and missing information; **the user confirms and acts** |
| **Life** | Tasks, appointments, deadlines, reminders, projects, goals, recurring tasks, own categories, day & week view |
| **Intelligence** | Transparent insights (overdue items, upcoming deadlines, missing info…) and *Ask ONE* chat — always with sources |

Plus: landing page, registration with email verification, onboarding, three membership tiers (Free / Premium / Exclusive), demo checkout, settings (profile, plan, data export, account deletion, support-access consent, feedback) and an owner-only admin area.

**ONE Business** is a separate product, not Personal in other colours:

| Area | What it does |
| --- | --- |
| **Dashboard** | KPIs, my tasks, projects with progress, recommendations (Confirmed / Conclusion), upcoming deadlines, team activity, Ask ONE Business |
| **Tasks** | assign to members, priorities, deadlines, sub-tasks, recurring processes (Growth+), filters: mine / all open / overdue / by person / done |
| **Projects** | description, responsible person, client, deadline, status (planned / active / on hold / done), progress, tasks, linked documents, history |
| **Memory** | company knowledge: documents, contracts, offers, invoices, information, processes; clients; link entries to clients and projects; summaries & task detection |
| **Action** | offers, business emails, client processes, contract deadlines, document analysis, meeting → tasks, internal processes, follow-ups; statuses New / In progress / Waiting for us / Waiting for a reply / Done |
| **Intelligence** | risks, bottlenecks, late projects, missing owners, matters without reply, workload, contracts without deadlines — each with sources and a Confirmed/Conclusion label |
| **Team** | invitations (7 days, bound to the email), roles Owner / Admin / Manager / Employee / Viewer, role changes, removal (open tasks are reassigned) |
| **Settings** | company profile, plan & billing (Owner only), your account, request to switch to Personal |

Every company is an isolated tenant (`organization_id`): server-side scoping, role checks on every request and Row Level Security in the database.

---

## Quick start (local demo mode — no external services needed)

Requirements: **Node.js ≥ 20.9** (tested with Node 22).

```bash
npm install
cp .env.example .env.local
# set a session secret (min. 32 chars)
echo "ONE_SESSION_SECRET=$(openssl rand -base64 48)" >> .env.local

# create your owner account and copy the printed id into .env.local
npm run owner:create -- --email you@example.com --password "YourStrongPassw0rd"
#   → ONE_OWNER_USER_ID=...

npm run dev          # http://localhost:3000
```

Without Supabase or an AI key ONE runs fully in **local demo mode**:

- **Database:** JSON file at `.data/one-db.json`, uploads in `.data/uploads/` (single instance, for development & demos)
- **Auth:** scrypt password hashes + signed httpOnly session cookie. Since no mail service is connected, the verification email is shown on the *Verify email* page in a clearly labelled **Demo mail outbox**.
- **AI:** clearly labelled **demo mode** — Ask ONE answers with a keyword search over the user's own data, summaries are extractive, task detection is rule-based, action plans use proven templates. Nothing is presented as AI output when it is not.
- **Billing:** **demo payment mode** — no money is charged; a plan is only activated after a server-side checkout record is confirmed.
- **Password reset:** without a mail service the reset link is **never shown in the browser** (that would allow account takeover); with `ONE_LOG_DEMO_MAIL=true` (or in `npm run dev`) it is written to the server log.

Add `ANTHROPIC_API_KEY` to enable real AI (Claude), `RESEND_API_KEY` for real emails, Stripe keys for real payments, and Supabase for production.

---

## Architecture

> Full description of the worlds, tenant isolation, roles and RLS: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

```
src/
  app/                    Next.js App Router (pages, layouts, route handlers)
    page.tsx              Landing page
    (auth)/               Login, registration, email verification (+ server actions)
    auth/                 verify (local), callback (Supabase), signout routes
    onboarding/           Welcome → plan → interests
    checkout/[id]/        Demo checkout (Stripe-ready)
    app/                  ONE Personal (protected; business accounts are redirected)
      page.tsx            Home dashboard with the central "Ask ONE" composer
      memory/ action/ life/ intelligence/ settings/
      _actions/           Server actions per module (all authorization happens here)
    business/             ONE Business: dashboard, tasks, projects, memory, action, intelligence, team, settings
      _actions/           work.ts (projects/tasks/clients), knowledge.ts (memory/actions/ask), team.ts
    invite/[token]/       Invitation landing (accept / register / sign in)
    admin/                ONE Admin (owner only, optional TOTP; audited server actions)
    verify-owner/         Owner second-factor check
    api/export            GDPR data export (JSON)
    api/billing/          Stripe webhook (signature-verified, idempotent) + customer portal redirect
    api/files/[id]        Owner-only file streaming
  proxy.ts                Session presence check + Supabase session refresh (Next 16 "proxy")
  components/             UI kit (ui/), app components (app/), brand, landing, admin
  lib/
    config/env.ts         Server-only environment access
    config/plans.ts       ★ Single source of truth for prices, limits & features
    auth/                 Auth service (local + Supabase), sessions, password hashing, rate limiting
    db/                   Storage-agnostic DB interface: local JSON store + Supabase implementation
                          userDb(userId) = per-user scoped access (RLS-backed in Supabase mode)
                          systemDb()     = service access for auth bootstrap, billing, admin
    ai/                   Exchangeable AI layer: provider.ts (Claude), service.ts (ask, summarize,
                          extract tasks, plan actions), retrieval.ts (BM25 RAG), templates.ts
    billing/              Checkout & plan activation: demo provider + Stripe (Checkout, webhook sync, portal)
    mail.ts               Transactional email via Resend (verification, password reset)
    permissions/          entitlements.ts (per person or per organization) · roles.ts (business role matrix)
    org.ts                Organization context, invitations, activity log (role always loaded from the DB)
    plans-store.ts        Plan catalogue = code defaults + owner overrides (plan_configs)
    admin-guard.ts        Owner gate + TOTP second factor · admin-metrics.ts (aggregates only)
    insights.ts           Rule-based, source-linked insights
    features.ts           Global feature flags (admin-managed)
    audit.ts              Append-only audit logging
    account.ts            Data export & account deletion
    storage/              Local folder or Supabase Storage
supabase/
  migrations/             Schema, RLS policies, triggers, storage bucket
  tests/                  RLS test-suite runnable against plain PostgreSQL
scripts/create-owner.mjs  Owner bootstrap for the local backend
tests/unit                Unit tests (retrieval, dates, plan config)
tests/e2e                 Browser end-to-end tests (Playwright)
```

**Separation of concerns**

- **Frontend** — React Server Components render data; small client components handle interaction. No secrets or admin flags ever reach the browser (only `NEXT_PUBLIC_*` variables are public; none of them grant anything).
- **Backend** — Server actions & route handlers. Every action re-checks the session (`assertUser` / `assertOwner`), validates input with `zod`, and uses `userDb(user.id)` which pins every query to the user's id.
- **Database** — Supabase PostgreSQL with Row Level Security on every private table (defense in depth: the app filters by `user_id` *and* the database enforces it).
- **AI service** — `lib/ai/provider.ts` is the only place talking to an AI API. Swap or add providers there.
- **Auth** — `lib/auth` hides whether Supabase Auth or the local auth is used.
- **Permissions** — `lib/permissions/entitlements.ts` + `lib/config/plans.ts`.
- **Subscriptions** — `lib/billing`. Plans change only through `activatePlan()` (confirmed checkout, Stripe webhook, or audited owner grant).

### Security model

| Concern | Implementation |
| --- | --- |
| Owner / super admin | Requires **both** `ONE_OWNER_USER_ID` (server-only env) **and** `role = 'owner'` in the database. No public admin registration; new accounts are always `role = 'user'` (DB trigger + app). A unique index guarantees a single owner. |
| Admin routes | `requireAdmin()` in the admin layout and pages, `assertAdmin()` in every admin server action (owner + verified TOTP if enabled). Non-owners get a 404. |
| Business tenants | `orgDb(orgId)` scoping, role loaded from `organization_members` on every request, RLS by active membership (viewers read-only), cross-scope trigger, single business owner per company. |
| Privilege escalation | Users have no UPDATE right on `profiles`; a trigger additionally blocks changes to role/plan/status/email unless done by the service role. Plans are never read from client input. |
| Data isolation | `userDb()` scoping + RLS `user_id = auth.uid()` on all private tables; composite foreign keys prevent linking to another user's rows. |
| Admin & private content | The admin area shows **metadata and counts only**. Private content is visible only with a user-granted, time-limited (≤ 7 days) **support access grant**; each view is written to the audit log. |
| Audit | `audit_logs` is append-only (DB trigger). Logged: logins, plan changes, checkouts, suspensions, flag changes, support access, exports, deletions. |
| Sessions & passwords | Local: scrypt (N=16384) + HS256-signed httpOnly cookie. Supabase: Supabase Auth. Login, registration, verification and password reset are rate-limited. Password reset uses single-use, hashed, 1-hour tokens and never reveals whether an address exists; a password change or reset revokes all other sessions. |
| Payments | A plan only changes through a **signature-verified Stripe webhook** (or confirmed demo checkout / audited owner grant). The success redirect from Stripe activates nothing by itself. Webhook processing is idempotent (`billing_events`). |
| Files | Stored under the owner's folder; served only to the owner; non-media types are forced to download; restrictive CSP. |
| External actions | ONE never sends, books or cancels anything. Completing an external step requires an explicit confirmation checkbox; "Open in my email app" only creates a draft in the user's own mail program. |
| AI grounding | The model is instructed to answer personal questions only from retrieved items, cite them, and say clearly when nothing is stored. In demo mode no text is generated at all. |
| Privacy | JSON export (`/api/export`) and full account deletion incl. files, from Settings → Privacy & data. |

---

## Environment variables

See [`.env.example`](.env.example). Summary:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | public | Base URL for email links |
| `ONE_BACKEND` | server | `local` or `supabase` (auto-detected if empty) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase project (safe to expose; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server secret** | Service access for system/admin paths |
| `ONE_SESSION_SECRET` | **server secret** | Local backend session signing (≥ 32 chars; required in production) |
| `ONE_DATA_DIR` | server | Local data folder (default `.data`) |
| `ONE_OWNER_USER_ID` | **server** | The owner's user id |
| `ANTHROPIC_API_KEY` | **server secret** | Enables real AI; without it: demo mode |
| `ONE_AI_MODEL` | server | Default `claude-opus-5-5` |
| `ONE_BILLING_MODE` | server | `demo` (default) or `stripe` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **server secret** | Stripe API key and webhook signing secret |
| `STRIPE_PRICE_<PLAN_ID>` | server | Recurring monthly Stripe price id per bookable plan (`PREMIUM`, `EXCLUSIVE`, `STARTER`, `GROWTH`, `SCALE`, custom plans) |
| `RESEND_API_KEY`, `ONE_MAIL_FROM` | **server secret** / server | Transactional email (local backend) |
| `ONE_LOG_DEMO_MAIL` | server | Demos/tests only: print undeliverable auth links to the server log |
| `ONE_DEFAULT_TIMEZONE` | server | Fallback timezone before the browser reports its own |

---

## Database setup (Supabase / production)

1. Create a Supabase project. In **Authentication → URL configuration** set the site URL and add `https://<your-domain>/auth/callback` as redirect URL. Keep "Confirm email" enabled.
2. Apply the migrations in `supabase/migrations/` (in order) — via the Supabase CLI (`supabase db push`) or by pasting them into the SQL editor.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and optionally `ONE_BACKEND=supabase`).
4. Configure SMTP in Supabase (Authentication → SMTP) for branded verification emails.

**Verify the schema & RLS locally** (needs a PostgreSQL with `createdb`/`psql`):

```bash
npm run test:db      # applies migrations to a throwaway DB with Supabase stubs and runs the RLS tests
```

## Languages (German / English)

Every page has a **DE / EN switch** (landing header, sign-in pages, onboarding, sidebar, admin header). The choice is stored in the `one_lang` cookie; without a choice ONE follows the browser language (German browsers get German).

- Translations live in [`src/lib/i18n/de.ts`](src/lib/i18n/de.ts). The **English text is the key**, so components simply call `tr("Some English text")` (server: `await getT()`, client: `useT()`). Missing translations fall back to English — nothing breaks.
- Variables: `tr("Upgrade to {plan}", { plan })`. Server-action messages are translated centrally in `lib/safe-action.ts`; dynamic service messages via patterns in `lib/i18n/index.ts`.
- Dates use the viewer's language and timezone. Emails, demo answers, starter content and action-letter templates are localised; real AI answers follow the language of the question.
- Adding a language: add the locale to `LOCALES`, create a dictionary file next to `de.ts`, and extend `translate()`.

## Roles: owner (admin) vs. users

| | Owner (you) | Everyone else |
| --- | --- | --- |
| After login | lands in **/admin** (admin view) | Personal accounts → **/app**, Business accounts → **/business** |
| Admin area | full access; “My personal ONE” link to use the app yourself | **does not exist for them**: `/admin` answers with a plain 404 (no redirect that would reveal it), no admin link anywhere |
| Private content of others | only via a user-granted, time-limited, logged support grant | — |

## Admin / owner setup

**Local backend**

```bash
npm run owner:create -- --email you@example.com --password "YourStrongPassw0rd"
# put the printed id into .env.local as ONE_OWNER_USER_ID and restart
```

**Supabase**

1. Register your account normally in the app and verify the email.
2. In the Supabase SQL editor (runs as `postgres`, not reachable from clients):
   ```sql
   select public.one_promote_owner('<your auth user id>');
   ```
3. Set `ONE_OWNER_USER_ID=<your auth user id>` in the server environment and redeploy.

`/admin` offers: overview (Personal vs. Business users, companies, plans, subscriptions, registrations, cancellations, up/downgrades, revenue from real Stripe payments only), users (filters by world, plan, subscription status, registration period, activity), businesses (metadata only), subscriptions, **plans & prices** (edit prices, availability, limits, features; create plans), analytics, account type requests, product flags & modules, feedback, settings (maintenance mode, business trial, branding, AI config), system status, **security (TOTP)** and the audit log. Every change is audited.

---

## Payments (Stripe)

1. In Stripe create a product per paid plan with a **recurring monthly price** and copy the price ids (`price_…`) into `STRIPE_PRICE_PREMIUM` / `STRIPE_PRICE_EXCLUSIVE`. Keep the amounts in sync with `src/lib/config/plans.ts`.
2. Add a webhook endpoint `https://<your-domain>/api/billing/stripe-webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; put its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Set `STRIPE_SECRET_KEY` and `ONE_BILLING_MODE=stripe`. Enable the **Customer Portal** in the Stripe dashboard (payment methods, invoices, cancellation).
4. Local testing: `stripe listen --forward-to localhost:3000/api/billing/stripe-webhook` and use the printed `whsec_…` secret.

Flow: *Choose plan → hosted Stripe Checkout → back to `/checkout/<id>` which waits for the webhook → plan active.* Cancelling in ONE schedules the end at the period end; Stripe's `customer.subscription.deleted` then returns the user to Free. `past_due` keeps access during Stripe's retry window and shows a notice. Admin revenue (MRR) counts only active Stripe subscriptions.

## Email

Local backend: set `RESEND_API_KEY` and `ONE_MAIL_FROM` to send verification and password-reset emails (branded HTML templates in `src/lib/mail.ts`). Supabase backend: configure SMTP and the email templates in Supabase; add `https://<your-domain>/auth/callback` to the redirect URLs (also used for password recovery).

## Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (Next.js + React hooks rules) |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Node test runner) |
| `npm run test:e2e` | Browser end-to-end tests against a running server (`BASE_URL`, `OWNER_EMAIL`, `OWNER_PASSWORD`; needs Playwright + Chromium). Covers registration & verification, onboarding & demo checkout, all four modules, data isolation between users, upgrade prompts, admin protection, suspension, audited plan grants, support access, feature flags, password change, password reset (set `SERVER_LOG` to the server's log file with `ONE_LOG_DEMO_MAIL=true`) and account deletion. Start the server fresh before running — sign-up rate limits are per IP. |
| `npm run test:e2e:business` | Business suite: world chooser, company setup, projects/tasks/sub-tasks, company memory & clients, actions, intelligence, invitations & roles, tenant + world isolation, account type requests, admin plan pricing, owner MFA, responsive check at 1440/1024/768/390/360 px, PWA. Start a fresh server first. |
| `npm run test:db` | Migration + RLS tests on a throwaway PostgreSQL database (incl. multi-tenant isolation) |
| `npm run test:stripe` | Starts its own server in Stripe mode (port 3100) and verifies the webhook: forged signatures rejected, activation, upgrades, past_due, scheduled cancellation, deletion, idempotency, graceful checkout errors. Needs a build. |
| `npm run owner:create` | Owner bootstrap (local backend) |

## Changing plans, prices and limits

Defaults live in [`src/lib/config/plans.ts`](src/lib/config/plans.ts); the owner changes prices, availability, limits, features and pricing-card bullets — and creates new plans — in **/admin/plans** (stored in `plan_configs`, merged by `lib/plans-store.ts`). Gates throughout the app (`requireFeature`, `consumeAiRequest`, `assertCanStore`, `assertMemberCapacity`, `assertProjectCapacity`, …) read the merged catalogue on the server, and locked features show an upgrade prompt. Business plans ship **without prices**; until a price is set they show “Price coming soon” and cannot be booked.

## AI integration

- Provider: Anthropic Claude via the official SDK (`@anthropic-ai/sdk`), server-side only, default model `claude-opus-5-5` (`ONE_AI_MODEL`). Effort scales with the plan (Free: low, Premium: medium, Exclusive: high). Refusal fallback is enabled server-side.
- **RAG:** a BM25 retriever over the user's own memories, document text, tasks and actions (`lib/ai/retrieval.ts`). Retrieved items are numbered; the answer's citations are mapped back to source chips.
- Functions: chat (Ask ONE), summaries, task & deadline extraction (structured output), action plans with drafts & missing information, and **text recognition** for images and scanned PDFs (Premium+, started explicitly by the user, uses one AI request; the model only transcribes what is visible).
- Usage limits are enforced per plan and month; AI errors are mapped to friendly messages; a global kill switch exists in the admin features page.

## Deployment

- **Recommended:** Vercel (or any Node host) + Supabase. Set the environment variables, apply migrations, deploy. The local JSON backend is **not** suitable for serverless or multi-instance hosting.
- Set `NEXT_PUBLIC_APP_URL` to your public URL and add the Supabase redirect URL.
- Behind a proxy, make sure `x-forwarded-for` is set (used for rate limiting). For multiple instances replace the in-memory rate limiter (`lib/auth/rate-limit.ts`) with Redis/Upstash.

## Known limitations

| Area | Status |
| --- | --- |
| Live services | Stripe, Resend, Anthropic and Supabase are fully integrated in code and covered by tests with local stand-ins (signed test webhooks, PostgreSQL with Supabase stubs). They have **not** been run against live accounts from this environment — do one staging run with real keys before launch. |
| Voice notes | Stored and playable; transcription is not implemented (Claude does not accept audio). |
| Semantic search | Lexical BM25; pgvector embeddings are prepared in the schema as a comment. |
| Notifications | Reminders appear in the app; push / email reminders are not implemented. |
| Localisation | English and German; further languages on the roadmap. |
| ONE Business | Automations, advanced reporting and integrations are shown as plan features but are **prepared, not functional**. Support access to company content is intentionally not available yet. Business prices must be set by the owner before companies can pay. |
| Offline | The PWA shows an offline page; data is not available offline by design (privacy). |
| Legal | Privacy policy and terms are placeholders that need legal review (incl. Impressum for Germany). |
| Scale | The local JSON backend and in-memory rate limiting are single-instance; use Supabase (and Redis for rate limits) in production. |

See [ROADMAP.md](ROADMAP.md) for what comes next.
