# Deployment Guide

This project is designed to be deployed as a small event-driven orchestration layer, not as a replacement CRM, payment processor, or booking system.

## Recommended topology

1. Supabase Postgres stores normalized lifecycle events, provider identities, lifecycle state, reconciliation findings, and metadata-only action audit.
2. A Supabase Edge Function receives provider webhooks, verifies them, normalizes them, and persists them through an atomic service-role RPC.
3. Scheduled workers or operator-triggered jobs process queued lifecycle events and reconciliation checks.
4. Provider APIs remain systems of record for their own domains.
5. MCP reader/admin surfaces sit above the engine for governed operator access.

## Install database migrations

Apply migrations in `supabase/migrations/` in order.

The reference schema enables row-level security without browser-facing policies. That creates a default-deny boundary for anon/authenticated clients while allowing trusted backend service-role execution.

## Deploy webhook function

Deploy `supabase/functions/lifecycle-webhook/index.ts` with external JWT verification disabled because Square, MailerLite, and Trafft do not send Supabase JWTs. The function implements provider verification itself.

Configure secrets only in your deployment secret manager. Do not store them in lifecycle configuration files or Git.

## Provider endpoints

Examples after deployment:

```text
https://<project>.supabase.co/functions/v1/lifecycle-webhook?provider=square
https://<project>.supabase.co/functions/v1/lifecycle-webhook?provider=mailerlite
https://<project>.supabase.co/functions/v1/lifecycle-webhook?provider=trafft&event=appointment.booked
```

Treat your actual deployment URL as configuration. Square signature validation includes the exact notification URL, so the stored `SQUARE_WEBHOOK_NOTIFICATION_URL` must exactly match the URL registered with Square.

## Processing model

Webhook request path:

```text
receive -> size check -> verify -> normalize -> atomic dedupe/persist -> 2xx
```

Heavy business logic should not run in the provider request cycle. Process persisted events asynchronously or via a scheduled worker.

## Reconciliation

Run reconciliation independently of webhook processing. Webhooks provide the fast path; reconciliation provides the repair path when events are missed, delayed, duplicated, or provider state changes outside the integration.

## Public/private boundary

Public repository configuration should use placeholders only. Tenant product IDs, CRM group IDs, booking service IDs, customer records, production URLs, and provider credentials belong in the downstream private deployment.
