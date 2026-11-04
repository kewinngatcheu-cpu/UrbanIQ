-- ONE 2.0: ONE Personal & ONE Business.
-- Two strictly separated worlds in one database:
--   personal rows: org_id IS NULL and user_id = owner of the row
--   business rows: org_id = organization, user_id = the member who created the row
-- Multi-tenant isolation is enforced by RLS through an active membership (security-definer helpers).

-- ───────────── Account type (server-controlled) ─────────────
alter table public.profiles
  add column account_type text not null default 'personal' check (account_type in ('personal', 'business')),
  add column active_org_id uuid;

-- Plans are configurable by the owner (plan_configs) — validate the id format, not a fixed list.
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_format check (plan ~ '^[a-z][a-z0-9_]{1,31}$');
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_format check (plan ~ '^[a-z][a-z0-9_]{1,31}$');
alter table public.user_preferences drop constraint if exists user_preferences_requested_plan_check;
alter table public.user_preferences add constraint user_preferences_requested_plan_format check (requested_plan is null or requested_plan ~ '^[a-z][a-z0-9_]{1,31}$');
alter table public.user_preferences add column company_name text check (company_name is null or char_length(company_name) <= 120);
alter table public.billing_checkouts drop constraint if exists billing_checkouts_plan_check;
alter table public.billing_checkouts add constraint billing_checkouts_plan_format check (plan ~ '^[a-z][a-z0-9_]{1,31}$');

-- account_type / active_org_id are protected like role and plan.
create or replace function public.protect_profile_columns() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    if new.role is distinct from old.role or new.plan is distinct from old.plan
       or new.status is distinct from old.status or new.email is distinct from old.email
       or new.email_verified is distinct from old.email_verified or new.id is distinct from old.id
       or new.account_type is distinct from old.account_type or new.active_org_id is distinct from old.active_org_id then
      raise exception 'not allowed to change protected profile fields';
    end if;
  end if;
  return new;
end $$;

-- Sign-up: the chosen world comes from metadata, but can only ever be personal or business (never admin).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested text := new.raw_user_meta_data ->> 'requested_plan';
  world text := case when new.raw_user_meta_data ->> 'account_type' = 'business' then 'business' else 'personal' end;
  company text := left(new.raw_user_meta_data ->> 'company_name', 120);
begin
  insert into public.profiles (id, email, email_verified, account_type)
    values (new.id, lower(new.email), new.email_confirmed_at is not null, world)
    on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_preferences (user_id, requested_plan, company_name)
    values (new.id, case when requested ~ '^[a-z][a-z0-9_]{1,31}$' and requested not in ('owner', 'admin') then requested end,
            case when world = 'business' then company end)
    on conflict (user_id) do nothing;
  return new;
end $$;

-- ───────────── Organizations ─────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  owner_id uuid not null references auth.users (id) on delete restrict,
  industry text,
  size text,
  plan text not null default 'starter' check (plan ~ '^[a-z][a-z0-9_]{1,31}$'),
  subscription_status text not null default 'trial' check (subscription_status in ('trial', 'active', 'past_due', 'canceled')),
  provider text not null default 'none' check (provider in ('none', 'demo', 'stripe', 'admin_grant')),
  provider_ref text,
  stripe_customer_id text,
  price_monthly_eur numeric(10, 2) not null default 0,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index organizations_stripe_customer on public.organizations (stripe_customer_id) where stripe_customer_id is not null;
alter table public.profiles add constraint profiles_active_org_fk foreign key (active_org_id) references public.organizations (id) on delete set null;

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'employee', 'viewer')),
  status text not null default 'active' check (status in ('active', 'removed')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index organization_members_user on public.organization_members (user_id) where status = 'active';
-- Exactly one business owner per organization.
create unique index organization_single_owner on public.organization_members (org_id) where role = 'owner' and status = 'active';

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'employee', 'viewer')),  -- nobody can be invited as owner
  token_hash text not null unique,
  invited_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null check (expires_at <= created_at + interval '30 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_activity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid not null,
  entity text not null check (entity in ('project', 'task', 'memory', 'action', 'member', 'client', 'org')),
  entity_id text,
  verb text not null,
  summary text not null,
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index org_activity_org on public.org_activity (org_id, created_at desc);

-- ───────────── Platform administration (service role only) ─────────────
create table public.plan_configs (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,31}$'),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.account_type_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_type text not null check (from_type in ('personal', 'business')),
  to_type text not null check (to_type in ('personal', 'business')),
  reason text not null check (char_length(reason) between 1 and 1000),
  company_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_type <> to_type)
);
create unique index account_type_requests_one_pending on public.account_type_requests (user_id) where status = 'pending';

-- ───────────── Business columns on the shared tables ─────────────
do $$
declare t text;
begin
  foreach t in array array['memories', 'documents', 'tasks', 'reminders', 'projects', 'categories', 'action_items', 'ai_conversations', 'ai_messages']
  loop
    execute format('alter table public.%I add column org_id uuid references public.organizations (id) on delete cascade', t);
    execute format('create index %I on public.%I (org_id) where org_id is not null', t || '_org', t);
  end loop;
end $$;

alter table public.memories add column client_id uuid references public.clients (id) on delete set null,
                            add column project_id uuid references public.projects (id) on delete set null;
alter table public.tasks add column assignee_id uuid references auth.users (id) on delete set null,
                         add column parent_id uuid references public.tasks (id) on delete cascade;
alter table public.projects add column stage text check (stage in ('planned', 'active', 'on_hold', 'done')),
                            add column lead_id uuid references auth.users (id) on delete set null,
                            add column client_id uuid references public.clients (id) on delete set null;
alter table public.usage_limits add column org_id uuid references public.organizations (id) on delete cascade;
alter table public.billing_checkouts add column org_id uuid references public.organizations (id) on delete cascade;

-- Usage is counted per person (personal) or per organization (business).
alter table public.usage_limits drop constraint usage_limits_user_id_period_key;
create unique index usage_limits_personal on public.usage_limits (user_id, period) where org_id is null;
create unique index usage_limits_org on public.usage_limits (org_id, period) where org_id is not null;

-- Extended statuses and action types.
alter table public.action_items drop constraint action_items_status_check;
alter table public.action_items add constraint action_items_status_check check (status in ('new', 'in_progress', 'waiting', 'waiting_external', 'done'));
alter table public.action_items drop constraint action_items_type_check;
alter table public.action_items add constraint action_items_type_check check (type in (
  'cancellation', 'complaint', 'understand_invoice', 'move', 'email', 'appointment', 'summarize', 'custom', 'reply_letter', 'authority',
  'client_process', 'analyze_document', 'contract_deadlines', 'offer', 'business_email', 'meeting_tasks', 'document_process', 'follow_up'));

-- Business files live under org-<org_id>/, personal files under <user_id>/.
alter table public.documents drop constraint documents_check;
alter table public.documents add constraint documents_storage_path_check check (
  (org_id is null and storage_path like user_id::text || '/%') or (org_id is not null and storage_path like 'org-' || org_id::text || '/%'));

-- In a company, members reference each other's rows (a task in a colleague's project).
-- Replace the per-user composite foreign keys with plain ones plus a same-scope check.
alter table public.memories drop constraint memories_document_id_user_id_fkey;
alter table public.memories add constraint memories_document_fk foreign key (document_id) references public.documents (id) on delete set null;
alter table public.tasks drop constraint tasks_project_id_user_id_fkey;
alter table public.tasks add constraint tasks_project_fk foreign key (project_id) references public.projects (id) on delete set null;
alter table public.tasks drop constraint tasks_source_memory_id_user_id_fkey;
alter table public.tasks add constraint tasks_source_memory_fk foreign key (source_memory_id) references public.memories (id) on delete set null;
alter table public.action_items drop constraint action_items_memory_id_user_id_fkey;
alter table public.action_items add constraint action_items_memory_fk foreign key (memory_id) references public.memories (id) on delete set null;

create function public.one_same_scope(tbl regclass, ref uuid, row_user uuid, row_org uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r_user uuid; r_org uuid;
begin
  if ref is null then return true; end if;
  execute format('select user_id, org_id from %s where id = $1', tbl) into r_user, r_org using ref;
  if r_user is null then return true; end if;  -- missing row: the foreign key reports it
  if row_org is null then return r_org is null and r_user = row_user; end if;
  return r_org = row_org;
end $$;

create function public.one_check_scope() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'memories' then
    if not public.one_same_scope('public.documents', new.document_id, new.user_id, new.org_id)
       or not public.one_same_scope('public.projects', new.project_id, new.user_id, new.org_id) then
      raise exception 'cross-scope reference';
    end if;
    if new.client_id is not null and (new.org_id is null or not exists (select 1 from public.clients c where c.id = new.client_id and c.org_id = new.org_id)) then
      raise exception 'cross-scope reference';
    end if;
  elsif tg_table_name = 'tasks' then
    if not public.one_same_scope('public.projects', new.project_id, new.user_id, new.org_id)
       or not public.one_same_scope('public.memories', new.source_memory_id, new.user_id, new.org_id)
       or not public.one_same_scope('public.tasks', new.parent_id, new.user_id, new.org_id) then
      raise exception 'cross-scope reference';
    end if;
    if new.assignee_id is not null and (new.org_id is null
       or not exists (select 1 from public.organization_members m where m.org_id = new.org_id and m.user_id = new.assignee_id and m.status = 'active')) then
      -- personal tasks are never assigned; business tasks only to active members
      if new.org_id is not null or new.assignee_id <> new.user_id then raise exception 'invalid assignee'; end if;
    end if;
  elsif tg_table_name = 'action_items' then
    if not public.one_same_scope('public.memories', new.memory_id, new.user_id, new.org_id) then raise exception 'cross-scope reference'; end if;
  elsif tg_table_name = 'projects' then
    if new.client_id is not null and (new.org_id is null or not exists (select 1 from public.clients c where c.id = new.client_id and c.org_id = new.org_id)) then
      raise exception 'cross-scope reference';
    end if;
  end if;
  return new;
end $$;
create trigger memories_scope before insert or update on public.memories for each row execute function public.one_check_scope();
create trigger tasks_scope before insert or update on public.tasks for each row execute function public.one_check_scope();
create trigger action_items_scope before insert or update on public.action_items for each row execute function public.one_check_scope();
create trigger projects_scope before insert or update on public.projects for each row execute function public.one_check_scope();

-- ───────────── Membership helpers for RLS ─────────────
create function public.one_org_role(target uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.organization_members m
    join public.organizations o on o.id = m.org_id
   where m.org_id = target and m.user_id = auth.uid() and m.status = 'active' and o.status = 'active'
$$;
create function public.one_is_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.one_org_role(target) is not null $$;
create function public.one_can_write(target uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.one_org_role(target) in ('owner', 'admin', 'manager', 'employee') $$;
revoke all on function public.one_same_scope(regclass, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.one_org_role(uuid), public.one_is_member(uuid), public.one_can_write(uuid) to authenticated;

-- ───────────── RLS ─────────────
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;   -- service role only
alter table public.clients enable row level security;
alter table public.org_activity enable row level security;
alter table public.plan_configs enable row level security;           -- service role only
alter table public.platform_settings enable row level security;      -- service role only (incl. owner MFA secret)
alter table public.account_type_requests enable row level security;

-- Personal rows: only the owner, and only rows outside any organization.
do $$
declare t text;
begin
  foreach t in array array['categories', 'documents', 'memories', 'projects', 'tasks', 'reminders', 'action_items', 'ai_conversations', 'ai_messages']
  loop
    execute format('drop policy "own rows: all" on public.%I', t);
    execute format('create policy "personal: own rows" on public.%I for all to authenticated using (org_id is null and user_id = auth.uid()) with check (org_id is null and user_id = auth.uid())', t);
  end loop;
  -- Company rows: readable by active members; writable by members whose role allows writing.
  foreach t in array array['documents', 'memories', 'projects', 'tasks', 'reminders', 'action_items', 'categories']
  loop
    execute format('create policy "business: members read" on public.%I for select to authenticated using (org_id is not null and public.one_is_member(org_id))', t);
    execute format('create policy "business: members insert" on public.%I for insert to authenticated with check (org_id is not null and user_id = auth.uid() and public.one_can_write(org_id))', t);
    execute format('create policy "business: members update" on public.%I for update to authenticated using (org_id is not null and public.one_can_write(org_id)) with check (org_id is not null and public.one_can_write(org_id))', t);
    execute format('create policy "business: members delete" on public.%I for delete to authenticated using (org_id is not null and public.one_can_write(org_id))', t);
  end loop;
  -- AI conversations inside a company stay private to the member who asked.
  foreach t in array array['ai_conversations', 'ai_messages']
  loop
    execute format('create policy "business: own conversations" on public.%I for all to authenticated using (org_id is not null and user_id = auth.uid() and public.one_is_member(org_id)) with check (org_id is not null and user_id = auth.uid() and public.one_is_member(org_id))', t);
  end loop;
end $$;

create policy "business: members read org" on public.organizations for select to authenticated using (public.one_is_member(id));
create policy "business: members read memberships" on public.organization_members for select to authenticated using (public.one_is_member(org_id));
create policy "business: members read clients" on public.clients for select to authenticated using (public.one_is_member(org_id));
create policy "business: write clients" on public.clients for all to authenticated
  using (public.one_org_role(org_id) in ('owner', 'admin', 'manager')) with check (user_id = auth.uid() and public.one_org_role(org_id) in ('owner', 'admin', 'manager'));
create policy "business: members read activity" on public.org_activity for select to authenticated using (public.one_is_member(org_id));
create policy "own requests: read" on public.account_type_requests for select to authenticated using (user_id = auth.uid());

grant select on public.organizations, public.organization_members, public.org_activity, public.account_type_requests to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
-- organization_invites, plan_configs, platform_settings: no grants → only the service role (server) can access them.
