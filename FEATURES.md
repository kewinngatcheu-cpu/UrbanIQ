# ONE — Feature status

Legend: **✅ done & tested** (covered by automated tests) · **🟢 done** (implemented, manually checked or partly tested) · **🟡 prepared** (structure/UI exists, not functional yet) · **⬜ planned**

Live third-party services (Stripe, Resend, Anthropic, Supabase) are integrated in code and tested with
local stand-ins; they have **not** been run against live accounts from this environment.

## Platform & accounts

| Feature | Status | Notes |
| --- | --- | --- |
| Registration with world choice (Personal / Business) | ✅ | stored server-side in `profiles.account_type` |
| Email verification, login, logout, password reset/change | ✅ | demo outbox locally, Resend / Supabase mailer in production |
| Controlled switch Personal ↔ Business | ✅ | user request → owner approval in admin; data never moved |
| DE / EN language switch | ✅ | all new ONE 2.0 screens translated |
| Maintenance mode | 🟢 | flag in admin; owner unaffected |
| PWA (manifest, icons, offline page) | ✅ | private content is never cached offline |
| Mobile-first layouts, tablet rail, collapsible desktop sidebar | ✅ | no horizontal overflow at 1440/1024/768/390/360 px (tested) |
| Camera upload on phones | 🟢 | “Take a photo” in upload dialogs |
| Push notifications | ⬜ | |

## ONE Personal

| Feature | Status |
| --- | --- |
| Dashboard with Ask / Remember / Task composer | ✅ |
| Memory: notes, ideas, info, goals, documents, images, voice files, tags, categories, search | ✅ |
| Document text extraction, AI text recognition (Premium+) | ✅ / 🟢 (AI part needs an API key) |
| Life: tasks, appointments, deadlines, reminders, projects, goals, recurring tasks, week view | ✅ |
| Action with statuses New / In progress / Waiting for you / **Waiting for a reply** / Done | ✅ |
| Action types incl. reply to a letter, authority matters | 🟢 |
| Intelligence: insights with **Confirmed / Conclusion** labels and sources | ✅ |
| Ask ONE (grounded answers, sources, no hallucination in demo mode) | ✅ |
| Plans Free 0 € · Premium 14,99 € · Exclusive 29,99 € with server-side limits | ✅ |
| Data export & account deletion, support-access consent | ✅ |
| Voice transcription | 🟡 |
| Integrations (calendar, mail) | 🟡 |

## ONE Business

| Feature | Status | Notes |
| --- | --- | --- |
| Company workspace setup (name, industry, size, plan, trial) | ✅ | trial length configurable in admin (default 14 days) |
| Business dashboard (KPIs, my tasks, projects, recommendations, deadlines, team activity) | ✅ | |
| Tasks: assign, priorities, deadlines, sub-tasks, recurring (Growth+), filters (mine / open / overdue / by person / done) | ✅ | |
| Projects: description, responsible person, client, deadline, status, progress, tasks, documents, history, archive | ✅ | |
| Company memory: documents, contracts, information, clients, link to client & project, search | ✅ | |
| Document analysis: summaries, text recognition, task & deadline detection → tasks | 🟢 | AI parts need an API key; demo mode is rule-based and labelled |
| Business actions: offer, business email, client process, document analysis, contract deadlines, meeting → tasks, internal process, follow-up | 🟢 | offer + all five statuses incl. “Waiting for a reply” covered by e2e; other types use the same flow |
| Business intelligence: overdue, late projects, missing leads, empty projects, waiting matters, no reply > 7 days, workload, contracts without deadline, unsummarised documents | ✅ | each insight labelled Confirmed / Conclusion with sources |
| Ask ONE Business (company-scoped, conversations private per member) | ✅ | |
| Team: invitations (email or copyable link), roles Owner/Admin/Manager/Employee/Viewer, role change, removal | ✅ | permissions checked server-side + RLS |
| Multi-tenant isolation by `organization_id` | ✅ | app scoping + RLS + cross-scope trigger (tested) |
| Company billing (Owner only), cancel, Stripe portal | 🟢 | business prices are **not set** until the owner configures them |
| Automations, advanced reporting, integrations | 🟡 | shown as plan features / modules “prepared” |

## ONE Admin

| Feature | Status | Notes |
| --- | --- | --- |
| Owner-only access (env + DB role), 404 for everyone else | ✅ | |
| Owner two-factor authentication (TOTP) | ✅ | optional, recommended; 12-hour verified sessions |
| Overview: Personal vs Business users, companies, plans, subscriptions, registrations, cancellations, up/downgrades, MRR (real Stripe only), system status | 🟢 | split view checked in e2e | |
| Users: search, filters (world, plan, subscription status, registration period, activity, suspended), details, suspend, grant plan | 🟢 | suspend / grant covered by e2e | |
| Businesses: list, filters, details (metadata & counts only), suspend, grant/trial plan | 🟢 | metadata-only view covered by e2e | |
| Subscriptions: personal & business, recent events | 🟢 | |
| Plans & prices: edit price, active, highlight, limits, features, bullets; create new plans | ✅ | limits enforced server-side immediately |
| Analytics: registrations per world, plan distribution, conversion, churn, ARPA (Stripe only), active users, module usage | 🟢 | labelled as demo data on the local backend |
| Product: feature flags, modules (live / prepared), beta | 🟢 | |
| System settings: maintenance, business trial, branding, support email, AI configuration (read-only) | 🟢 | branding values are stored; not yet used in all templates |
| Account type requests (approve / reject) | ✅ | |
| Feedback, system status, audit log | ✅ | |
| Support access to company content | 🟡 | intentionally not available; needs an owner-approved, logged process (planned) |
