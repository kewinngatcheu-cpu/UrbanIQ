-- OUR SUMMER ESCAPE 2027 – Supabase / PostgreSQL schema
-- Run once in Supabase → SQL Editor. Idempotent.
--
-- Security model:
--  * Row Level Security is ENABLED on every table and NO policies are created.
--    => the public "anon" key can read/write NOTHING.
--  * Only the Next.js server talks to the database, using the service-role key
--    (SUPABASE_SERVICE_ROLE_KEY, never exposed to the browser).
--  * Access tokens are stored only as HMAC-SHA256 hashes.
--  * Answers are stored AES-256-GCM encrypted (column "payload"); the key is
--    derived from APP_SECRET and never stored in the database.

create table if not exists public.settings (
  id          int primary key default 1 check (id = 1),
  phase       text not null default 'setup' check (phase in ('setup', 'live')),
  started_at  timestamptz
);

create table if not exists public.participants (
  id                text primary key check (id in ('joanna', 'kewin')),
  display_name      text not null,
  token_hash        text unique,
  token_created_at  timestamptz
);

create table if not exists public.responses (
  participant_id  text primary key references public.participants (id) on delete cascade,
  payload         text not null,             -- encrypted JSON (v1.<iv>.<tag>.<ciphertext>)
  status          text not null check (status in ('draft', 'submitted')),
  updated_at      timestamptz not null default now(),
  submitted_at    timestamptz
);

-- A submitted response can never be changed again – enforced in the database too.
create or replace function public.lock_submitted() returns trigger
language plpgsql as $$
begin
  if old.status = 'submitted' then
    raise exception 'response is locked';
  end if;
  return new;
end $$;

drop trigger if exists responses_lock on public.responses;
create trigger responses_lock before update on public.responses
  for each row execute function public.lock_submitted();

alter table public.settings     enable row level security;
alter table public.participants enable row level security;
alter table public.responses    enable row level security;

revoke all on public.settings, public.participants, public.responses from anon, authenticated;

insert into public.settings (id, phase) values (1, 'setup') on conflict (id) do nothing;
insert into public.participants (id, display_name) values ('joanna', 'Joanna'), ('kewin', 'Kewin') on conflict (id) do nothing;
