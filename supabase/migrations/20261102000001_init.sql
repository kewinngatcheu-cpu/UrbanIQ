-- ════════════════════════════════════════════════════════════════════
-- ONE — initial schema (Supabase / PostgreSQL)
-- Principles:
--  * Every private row carries user_id and is protected by Row Level Security.
--  * Users can never change role / plan / status — those columns are written
--    only by the server (service role) after server-side checks.
--  * Admin data (audit_logs, feedback, feature_flags, billing) is service-role only.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Profiles (1:1 with auth.users) ─────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'owner')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  plan text not null default 'free' check (plan in ('free', 'premium', 'exclusive')),
  email_verified boolean not null default false,
  onboarding_completed boolean not null default false,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_single_owner on public.profiles ((role)) where role = 'owner';

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'exclusive')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'pending')),
  provider text not null default 'none' check (provider in ('none', 'demo', 'stripe', 'admin_grant')),
  provider_ref text,
  price_monthly_eur numeric(10, 2) not null default 0,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  interests text[] not null default '{}',
  requested_plan text check (requested_plan in ('free', 'premium', 'exclusive')),
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#6aafe8',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_path text not null,
  extracted_text text,
  extraction_status text not null default 'pending' check (extraction_status in ('done', 'unsupported', 'failed', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- files must live in the owner's folder
  check (storage_path like user_id::text || '/%')
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'idea', 'info', 'goal', 'document', 'image', 'voice')),
  title text not null check (char_length(title) between 1 and 200),
  content text not null default '',
  summary text,
  summary_source text check (summary_source in ('ai', 'extractive')),
  tags text[] not null default '{}',
  category_id uuid,
  document_id uuid,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (document_id, user_id) references public.documents (id, user_id) on delete set null (document_id)
);
create index memories_user_created on public.memories (user_id, created_at desc);
create index memories_tags on public.memories using gin (tags);
-- Prepared for semantic search (pgvector) — see ROADMAP.md
-- alter table public.memories add column embedding vector(1024);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'project' check (kind in ('project', 'goal')),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  color text not null default '#6aafe8',
  status text not null default 'active' check (status in ('active', 'archived')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'task' check (kind in ('task', 'appointment', 'deadline')),
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'done')),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  project_id uuid,
  category_id uuid,
  source_memory_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (source_memory_id, user_id) references public.memories (id, user_id) on delete set null (source_memory_id)
);
create index tasks_user_due on public.tasks (user_id, status, due_at);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  remind_at timestamptz not null,
  done boolean not null default false,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_user_at on public.reminders (user_id, remind_at);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('cancellation', 'complaint', 'understand_invoice', 'move', 'email', 'appointment', 'summarize', 'custom')),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'waiting', 'done')),
  steps jsonb not null default '[]',
  draft text,
  plan_source text check (plan_source in ('ai', 'template')),
  missing_info text[] not null default '{}',
  memory_id uuid,
  external_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (memory_id, user_id) references public.memories (id, user_id) on delete set null (memory_id)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]',
  mode text not null default 'demo' check (mode in ('ai', 'demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a message can only belong to a conversation of the same user
  foreign key (conversation_id, user_id) references public.ai_conversations (id, user_id) on delete cascade
);
create index ai_messages_conv on public.ai_messages (conversation_id, created_at);

create table public.usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  ai_requests integer not null default 0 check (ai_requests >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

create table public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '7 days')
);

create table public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('premium', 'exclusive')),
  provider text not null check (provider in ('demo', 'stripe')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled')),
  amount_eur numeric(10, 2) not null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  kind text not null default 'feedback' check (kind in ('feedback', 'bug', 'idea')),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_created on public.audit_logs (created_at desc);
create index audit_logs_target on public.audit_logs (target_id);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Audit log is append-only (even for the service role) ───────────
create function public.forbid_audit_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is append-only';
end $$;
create trigger audit_logs_append_only before update or delete on public.audit_logs
  for each row execute function public.forbid_audit_mutation();

-- ─── Privileged columns: only the service role / database owner may change them ─
create function public.protect_profile_columns() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    if new.role is distinct from old.role or new.plan is distinct from old.plan
       or new.status is distinct from old.status or new.email is distinct from old.email
       or new.email_verified is distinct from old.email_verified or new.id is distinct from old.id then
      raise exception 'not allowed to change protected profile fields';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ─── New auth user → profile, free subscription, preferences (never elevated) ─
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data ->> 'requested_plan';
begin
  insert into public.profiles (id, email, email_verified)
    values (new.id, lower(new.email), new.email_confirmed_at is not null)
    on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_preferences (user_id, requested_plan)
    values (new.id, case when requested in ('free', 'premium', 'exclusive') then requested end)
    on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true, updated_at = now() where id = new.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- ─── Owner bootstrap (run manually in the SQL editor; not callable by clients) ─
create function public.one_promote_owner(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set role = 'user' where role = 'owner' and id <> target;
  update public.profiles set role = 'owner', status = 'active', updated_at = now() where id = target;
  if not found then raise exception 'profile % not found', target; end if;
  insert into public.audit_logs (action, target_type, target_id, details)
    values ('system.owner_bootstrapped', 'user', target::text, '{"via":"one_promote_owner"}');
end $$;
revoke all on function public.one_promote_owner(uuid) from public, anon, authenticated;

-- ═══════════════════════ Row Level Security ═════════════════════════
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.documents enable row level security;
alter table public.memories enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.action_items enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.usage_limits enable row level security;
alter table public.support_access_grants enable row level security;
alter table public.billing_checkouts enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;

-- Read-only own rows (writes happen server-side with the service role)
create policy "own profile: read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own subscription: read" on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy "own usage: read" on public.usage_limits for select to authenticated using (user_id = auth.uid());
create policy "own checkouts: read" on public.billing_checkouts for select to authenticated using (user_id = auth.uid());

-- Full CRUD on own private content
do $$
declare t text;
begin
  foreach t in array array['user_preferences', 'categories', 'documents', 'memories', 'projects', 'tasks', 'reminders',
                           'action_items', 'ai_conversations', 'ai_messages', 'support_access_grants']
  loop
    execute format('create policy "own rows: all" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- feedback, audit_logs, feature_flags: no policies → only the service role (server) can access.

-- Least privilege for API roles
revoke all on all tables in schema public from anon;
grant select on public.profiles, public.subscriptions, public.usage_limits, public.billing_checkouts to authenticated;
grant select, insert, update, delete on public.user_preferences, public.categories, public.documents, public.memories,
  public.projects, public.tasks, public.reminders, public.action_items, public.ai_conversations, public.ai_messages,
  public.support_access_grants to authenticated;
