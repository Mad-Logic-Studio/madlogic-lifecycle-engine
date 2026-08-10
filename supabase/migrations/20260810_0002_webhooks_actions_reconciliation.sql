create table if not exists public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text,
  signature_valid boolean not null,
  received_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  lifecycle_event_id text,
  status text not null default 'received' check (status in ('received','accepted','rejected','failed')),
  error_code text,
  unique(provider, provider_event_id)
);

create index if not exists webhook_receipts_status_idx
  on public.webhook_receipts(status, received_at);

create table if not exists public.lifecycle_action_runs (
  id uuid primary key default gen_random_uuid(),
  event_id text references public.lifecycle_events(event_id) on delete set null,
  subject_id uuid references public.lifecycle_subjects(id) on delete set null,
  rule_id text,
  action_kind text not null,
  action_risk text not null check (action_risk in ('read','low','important','destructive')),
  idempotency_key text,
  status text not null check (status in ('planned','review_required','running','succeeded','failed','skipped')),
  provider text,
  resource_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lifecycle_action_runs_idempotency_idx
  on public.lifecycle_action_runs(idempotency_key)
  where idempotency_key is not null and status in ('running','succeeded');

create table if not exists public.reconciliation_findings (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.lifecycle_subjects(id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('info','warning','critical')),
  repair_safety text not null check (repair_safety in ('report_only','safe_idempotent','review_required')),
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  details jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists reconciliation_findings_open_idx
  on public.reconciliation_findings(status, severity, detected_at desc);

create table if not exists public.lifecycle_write_audit (
  id bigint generated always as identity primary key,
  actor_id text,
  client_id text,
  tool_name text not null,
  provider text,
  status text not null check (status in ('attempt','success','failure')),
  resource_id text,
  upstream_http_status integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists lifecycle_write_audit_created_idx
  on public.lifecycle_write_audit(created_at desc);

-- Default-deny browser access. Backend/service-role deployments can use these
-- tables without publishing customer lifecycle state to anon/authenticated clients.
alter table public.lifecycle_subjects enable row level security;
alter table public.provider_identities enable row level security;
alter table public.lifecycle_events enable row level security;
alter table public.lifecycle_states enable row level security;
alter table public.webhook_receipts enable row level security;
alter table public.lifecycle_action_runs enable row level security;
alter table public.reconciliation_findings enable row level security;
alter table public.lifecycle_write_audit enable row level security;

comment on table public.webhook_receipts is 'Minimal webhook receipt ledger used for authentication, deduplication, and delivery diagnostics.';
comment on table public.lifecycle_action_runs is 'Workflow action execution metadata. Do not store secrets or raw customer payloads here.';
comment on table public.reconciliation_findings is 'Cross-system consistency findings and repair-safety classification.';
comment on table public.lifecycle_write_audit is 'Metadata-only operator write audit; intentionally excludes request payloads and PII.';
