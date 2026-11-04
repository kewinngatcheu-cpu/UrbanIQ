-- Stripe integration: customer reference, scheduled cancellation and webhook idempotency.
alter table public.subscriptions
  add column stripe_customer_id text,
  add column cancel_at_period_end boolean not null default false;
create unique index subscriptions_stripe_customer on public.subscriptions (stripe_customer_id) where stripe_customer_id is not null;

create table public.billing_events (
  id text primary key,            -- Stripe event id (evt_...)
  type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;  -- service role only

-- AI text recognition for images / scanned PDFs
alter table public.documents
  add column extraction_method text check (extraction_method in ('parser', 'ai'));
