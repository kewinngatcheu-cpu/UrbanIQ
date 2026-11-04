# ONE — Architecture

> **ONE – Your Life. Your Business. One Intelligent System.**
> One code base, two strictly separated product worlds (**ONE Personal**, **ONE Business**) and one platform administration (**ONE Admin**).

## 1. Overview

```
                    ┌────────────────────────── Next.js 16 (App Router) ──────────────────────────┐
 Browser / PWA ───▶ │ proxy.ts  (session presence, Supabase refresh, /admin → 404 without session) │
                    │                                                                              │
                    │  /            Landing (Personal + Business)                                  │
                    │  /register    World chooser → registration (personal | business | invite)    │
                    │  /onboarding  Personal onboarding  |  Business setup / join company          │
                    │  /app/*       ONE PERSONAL   requireUser()  → userDb(userId)                 │
                    │  /business/*  ONE BUSINESS   requireOrg()   → orgDb(orgId, actorId) + roles  │
                    │  /admin/*     ONE ADMIN      requireAdmin() → owner + optional TOTP          │
                    │  /invite/[t]  Invitation landing        /verify-owner  Owner 2nd factor      │
                    │  /api/*       export, files, billing webhook & portal                        │
                    └───────────────┬──────────────────────────────┬──────────────────────────────┘
                                    │ server actions only           │
                         lib/db (local JSON | Supabase)      lib/ai (Claude | demo)   lib/billing (demo | Stripe)
                                    │
                    Supabase Postgres + RLS (migrations 0001–0004)  ·  Storage bucket "documents"
```

Everything that decides about access runs **on the server**: layouts and pages load the user, the
organization and the role from the database, server actions re-check them, and in Supabase mode
Row Level Security enforces the same rules once more in the database.

## 2. The three worlds

| | ONE Personal | ONE Business | ONE Admin |
| --- | --- | --- | --- |
| Who | private individuals | companies, freelancers, teams | only the platform owner (Kewin Ngatcheu) |
| Chosen | at registration (`account_type = personal`) | at registration (`account_type = business`) or via invitation | server-side bootstrap only |
| Routes | `/app/*` | `/business/*` | `/admin/*` (404 for everyone else) |
| Data scope | `user_id = me AND org_id IS NULL` | `org_id = my active organization` | metadata & counts only |
| Plans | Free · Premium · Exclusive | Starter · Growth · Scale (prices set in admin) | manages all plans |

`profiles.account_type` is set **once** at sign-up (DB trigger and app accept only `personal` or
`business`; anything else falls back to `personal`). It is a protected column: users cannot update it
(trigger + no UPDATE grant). A switch is only possible through an **account type request** that the
owner approves in `/admin/requests`; data is never moved between worlds.

Routing guards:
- `app/app/layout.tsx` redirects business accounts to `/business`.
- `lib/org.ts › requireOrg()` redirects personal accounts to `/app` and business accounts without an
  active membership to `/onboarding` (create or join a company).
- `/admin` and `/verify-owner` call `requireOwner()` → `notFound()` for everybody else.

## 3. Data model

Shared tables (`memories, documents, tasks, reminders, projects, categories, action_items,
ai_conversations, ai_messages`) carry an `org_id`:

- personal rows: `org_id IS NULL`, `user_id` = owner of the row
- business rows: `org_id` = organization, `user_id` = the member who created the row

Business-only tables: `organizations`, `organization_members` (role, status), `organization_invites`
(hashed token, 7 days), `clients`, `org_activity` (team feed / project history).
Platform tables (service role only): `plan_configs`, `platform_settings` (trial days, branding,
owner MFA secret), `account_type_requests`, `feature_flags`, `audit_logs` (append-only).

Extra business columns: `tasks.assignee_id`, `tasks.parent_id` (one level of sub-tasks),
`projects.stage / lead_id / client_id`, `memories.client_id / project_id`, `usage_limits.org_id`,
`billing_checkouts.org_id`.

### Access layers (`src/lib/db/index.ts`)

| Helper | Use | Scope |
| --- | --- | --- |
| `userDb(userId)` | ONE Personal | every query pinned to `user_id` and, for shared tables, `org_id IS NULL` |
| `orgDb(orgId, actorId)` | ONE Business | every query pinned to `org_id`; inserts record the acting member; only org tables allowed |
| `systemDb()` | auth bootstrap, billing, usage, audit, admin | service access — only behind `requireOwner/assertAdmin` or server-internal code |

In Supabase mode `userDb`/`orgDb` run through the **user's session client**, so RLS applies.

### Row Level Security (migration `20261104000004_business.sql`)

- Personal: `org_id IS NULL AND user_id = auth.uid()`.
- Business read: `one_is_member(org_id)` (active membership in an active organization).
- Business write: `one_can_write(org_id)` (owner/admin/manager/employee — **viewers cannot write**),
  inserts must use `user_id = auth.uid()`.
- Business AI conversations are private to the member who asked.
- Clients: read for members, write for owner/admin/manager.
- `organization_invites`, `plan_configs`, `platform_settings`: no grants → server only.
- Cross-scope references are rejected by a trigger (`one_check_scope`): a task can't point at
  another company's project, a personal row can't point at a company row, tasks can only be assigned
  to active members.
- One business owner per organization (partial unique index); invitations can never grant `owner`.

`npm run test:db` applies all migrations to a throwaway PostgreSQL and runs `supabase/tests/rls.test.sql`
(personal isolation, owner bootstrap, tenant isolation, viewer read-only, removed-member lockout,
cross-tenant references, protected `account_type`, admin-only tables).

## 4. Roles & permissions (ONE Business)

`src/lib/permissions/roles.ts` is the single matrix (pure, unit-tested):

| Permission | Owner | Admin | Manager | Employee | Viewer |
| --- | :-: | :-: | :-: | :-: | :-: |
| company profile (`org.manage`) | ✓ | ✓ | | | |
| billing (`org.billing`) | ✓ | | | | |
| invite / manage members | ✓ | ✓ | | | |
| create / edit / archive projects | ✓ | ✓ | ✓ | | |
| create tasks, edit own tasks | ✓ | ✓ | ✓ | ✓ | |
| assign / edit / delete any task | ✓ | ✓ | ✓ | | |
| write knowledge, use actions | ✓ | ✓ | ✓ | ✓ | |
| delete anyone's knowledge, manage clients | ✓ | ✓ | ✓ | | |
| view everything shared in the company | ✓ | ✓ | ✓ | ✓ | ✓ |

The role is **always loaded from `organization_members`** on the server (`lib/org.ts › loadContext`),
never from the client. `requireOrgPage(perm)` → 404 for pages, `assertOrg(perm)` → error in actions.
Admins cannot create admins; nobody can create a second owner; the owner cannot be removed.

## 5. Plans, entitlements & limits

- Defaults: `src/lib/config/plans.ts` (personal prices 0 / 14.99 / 29.99 €; business prices `null`).
- Owner overrides & custom plans: table `plan_configs`, merged by `src/lib/plans-store.ts`
  (`getCatalog`, `plansFor(world)`, `findPlan`, `savePlanConfig`).
- `src/lib/permissions/entitlements.ts`: `entitlementsFor(subject)` where the subject is a person
  (personal) or an organization (business). Server-side gates: `requireFeature`, `consumeAiRequest`
  (per person or per organization and month), `assertCanStore`, `assertMemoryCapacity`,
  `assertActionCapacity`, `assertProjectCapacity`, `assertMemberCapacity` (seats incl. open
  invitations), `assertWritable` (business trial expired / canceled → read-only).
- A plan with `priceMonthlyEur = null` is shown as “Price coming soon” and **cannot be booked**
  (checked in `lib/billing › createCheckout`).

## 6. Billing

`lib/billing/index.ts` — demo provider and Stripe. Personal subscriptions live in `subscriptions`,
company plans on the `organizations` row (`plan, subscription_status, provider, trial_ends_at, …`).
Stripe price ids come from `STRIPE_PRICE_<PLAN_ID>`; the signed webhook activates personal or company
plans (metadata `org_id`). Only the Business Owner (`org.billing`) can start or confirm a company
checkout. Admin revenue (MRR, ARPA) counts **only real Stripe subscriptions**.

## 7. AI

`lib/ai/service.ts` takes an `AiCtx { user, ent, db, world, orgName }`. Retrieval (BM25) runs over the
scoped DB of the current world, so personal answers never see company data and vice versa. The business
prompt adds rules for distinguishing **confirmed facts, conclusions and uncertainty**; the rule-based
insights (`lib/insights.ts`, `lib/business-insights.ts`) carry a `certainty` (`fact` | `inference`)
shown as “Confirmed” / “Conclusion” badges. Demo mode (no API key) never generates text.

## 8. ONE Admin

- Access: `ONE_OWNER_USER_ID` (server env) **and** `profiles.role = 'owner'` (set only by
  `scripts/create-owner.mjs` / `one_promote_owner()`), plus optional **TOTP second factor**
  (`lib/auth/totp.ts`, `lib/admin-guard.ts`). With MFA on, every admin page/action requires a signed,
  httpOnly, 12-hour cookie obtained on `/verify-owner`.
- Areas: overview, users, businesses, subscriptions, plans & prices, analytics, account type
  requests, product (modules / flags / beta), feedback, system settings (maintenance mode, trial days,
  branding, AI config), system status, security (MFA), audit log.
- Privacy: no private or company content in admin. Personal support access needs a user-issued,
  time-limited grant and each view is logged; company content is not viewable at all.

## 9. Frontend & devices

- `components/shell/nav-shell.tsx` — one shell for both worlds: collapsible desktop sidebar (cookie
  `one_nav`), icon rail on tablets, top bar + bottom navigation + “More” sheet on phones.
- Mobile upload offers “Take a photo” (`capture="environment"`).
- PWA: `app/manifest.ts`, icons in `public/icons/`, `public/sw.js` (offline page only — private pages
  and API responses are never cached), registration in `components/pwa.tsx` (production only).
- i18n: English text is the key, German in `lib/i18n/de.ts`; dynamic messages and activity history via
  patterns in `lib/i18n/index.ts`.

## 10. Tests

| Suite | Command | What |
| --- | --- | --- |
| Unit | `npm test` | plans (no invented business prices), roles matrix, TOTP (RFC 6238 vectors), retrieval |
| Database | `npm run test:db` | migrations + RLS incl. tenant isolation |
| Stripe | `npm run test:stripe` | signed webhooks, activation, cancellation, idempotency |
| E2E Personal | `npm run test:e2e` | 34 browser steps (registration → all modules → admin → deletion, DE/EN) |
| E2E Business | `npm run test:e2e:business` | registration chooser, company setup, projects/tasks/sub-tasks, knowledge & clients, actions, intelligence, invitations, roles, tenant & world isolation, account type request, admin plan pricing, owner MFA, responsive 1440/1024/768/390/360, mobile nav, PWA |
