create extension if not exists pgcrypto;

create table if not exists public.lifecycle_subjects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_identities (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.lifecycle_subjects(id) on delete cascade,
  provider text not null,
  provider_identity_type text not null,
  provider_identity_id text not null,
  normalized_email text,
  normalized_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_identity_type, provider_identity_id)
);

create index if not exists provider_identities_subject_idx
  on public.provider_identities(subject_id);
create index if not exists provider_identities_email_idx
  on public.provider_identities(normalized_email)
  where normalized_email is not null;
create index if not exists provider_identities_phone_idx
  on public.provider_identities(normalized_phone)
  where normalized_phone is not null;

create table if not exists public.lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  provider text not null,
  event_type text not null,
  provider_event_id text not null,
  dedupe_key text not null unique,
  subject_id uuid references public.lifecycle_subjects(id) on delete set null,
  occurred_at timestamptz not null,
  received_at timestamptz not null,
  processed_at timestamptz,
  correlation_id text not null,
  status text not null check (status in ('received','processing','processed','failed','dead_letter')),
  retry_count integer not null default 0 check (retry_count >= 0),
  payload jsonb not null,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifecycle_events_subject_idx
  on public.lifecycle_events(subject_id, received_at desc);
create index if not exists lifecycle_events_status_idx
  on public.lifecycle_events(status, received_at);
create index if not exists lifecycle_events_provider_type_idx
  on public.lifecycle_events(provider, event_type, received_at desc);

create table if not exists public.lifecycle_states (
  subject_id uuid primary key references public.lifecycle_subjects(id) on delete cascade,
  stage text not null check (stage in (
    'lead','prospect','purchaser','needs_fulfillment','booked','completed','follow_up','returning_customer'
  )),
  source_event_id text,
  changed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lifecycle_states_stage_idx
  on public.lifecycle_states(stage, changed_at desc);

comment on table public.lifecycle_subjects is 'Provider-neutral lifecycle subjects. Tenant deployments should enforce their own RLS/service-role boundary.';
comment on table public.provider_identities is 'Links provider-specific identities to an internal lifecycle subject.';
comment on table public.lifecycle_events is 'Normalized lifecycle event ledger. Production payload retention/minimization is deployment policy.';
comment on table public.lifecycle_states is 'Current provider-neutral lifecycle stage for each subject; transition validity is enforced by the engine.';
