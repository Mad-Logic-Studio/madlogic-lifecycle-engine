create or replace function public.lifecycle_ingest_webhook(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_received_at timestamptz,
  p_payload jsonb,
  p_payload_hash text,
  p_signature_valid boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_event_id text;
  v_correlation_id text;
  v_dedupe_key text;
  v_existing_event text;
begin
  if not p_signature_valid then
    raise exception 'signature_not_verified';
  end if;

  if coalesce(trim(p_provider), '') = ''
     or coalesce(trim(p_provider_event_id), '') = ''
     or coalesce(trim(p_event_type), '') = '' then
    raise exception 'missing_event_identity';
  end if;

  v_dedupe_key := p_provider || ':' || p_provider_event_id;
  v_correlation_id := encode(extensions.digest(v_dedupe_key, 'sha256'), 'hex');

  select lifecycle_event_id
    into v_existing_event
  from public.webhook_receipts
  where provider = p_provider and provider_event_id = p_provider_event_id;

  if found then
    return jsonb_build_object(
      'accepted', false,
      'duplicate', true,
      'event_id', v_existing_event,
      'correlation_id', v_correlation_id
    );
  end if;

  v_event_id := gen_random_uuid()::text;

  insert into public.webhook_receipts (
    provider, provider_event_id, event_type, payload_hash, signature_valid,
    received_at, acknowledged_at, lifecycle_event_id, status
  ) values (
    p_provider, p_provider_event_id, p_event_type, p_payload_hash, true,
    coalesce(p_received_at, now()), now(), v_event_id, 'accepted'
  );

  insert into public.lifecycle_events (
    event_id, provider, event_type, provider_event_id, dedupe_key,
    occurred_at, received_at, correlation_id, status, payload
  ) values (
    v_event_id, p_provider, p_event_type, p_provider_event_id, v_dedupe_key,
    coalesce(p_occurred_at, p_received_at, now()), coalesce(p_received_at, now()),
    v_correlation_id, 'received', p_payload
  );

  return jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'event_id', v_event_id,
    'correlation_id', v_correlation_id
  );
exception
  when unique_violation then
    select lifecycle_event_id
      into v_existing_event
    from public.webhook_receipts
    where provider = p_provider and provider_event_id = p_provider_event_id;

    return jsonb_build_object(
      'accepted', false,
      'duplicate', true,
      'event_id', v_existing_event,
      'correlation_id', v_correlation_id
    );
end;
$function$;

revoke all on function public.lifecycle_ingest_webhook(text,text,text,timestamptz,timestamptz,jsonb,text,boolean)
  from public, anon, authenticated;
grant execute on function public.lifecycle_ingest_webhook(text,text,text,timestamptz,timestamptz,jsonb,text,boolean)
  to service_role;

create or replace function public.lifecycle_operations_summary()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select jsonb_build_object(
    'received_events', (select count(*) from public.lifecycle_events where status = 'received'),
    'failed_events', (select count(*) from public.lifecycle_events where status in ('failed','dead_letter')),
    'open_findings', (select count(*) from public.reconciliation_findings where status = 'open'),
    'critical_findings', (select count(*) from public.reconciliation_findings where status = 'open' and severity = 'critical'),
    'review_actions', (select count(*) from public.lifecycle_action_runs where status = 'review_required'),
    'generated_at', now()
  );
$function$;

revoke all on function public.lifecycle_operations_summary() from public, anon, authenticated;
grant execute on function public.lifecycle_operations_summary() to service_role;
