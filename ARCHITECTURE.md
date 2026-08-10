# Architecture

## Purpose

MadLogic Lifecycle Engine coordinates customer state across systems of record without replacing them.

The engine is intentionally split into reusable core services and replaceable provider adapters.

## System boundaries

### Systems of record

Provider platforms remain authoritative for their own domains:

- commerce provider: orders, payments, refunds, catalog/customer references
- CRM provider: subscriber state, consent, groups, campaigns, automations
- booking provider: customers, services, appointments, availability

### Lifecycle Engine

The engine owns only cross-system coordination concerns:

- normalized event history
- provider identity links
- lifecycle state derived from source facts
- workflow decisions
- reconciliation findings
- operational audit

It must not silently become a duplicate CRM, booking database, or payment ledger.

## Core modules

### Event Ledger

Every inbound webhook is normalized into a provider-neutral envelope. Event IDs are deduplicated before processing.

Suggested fields:

- internal event UUID
- provider
- provider event ID
- event type
- subject identity, when known
- correlation ID
- received timestamp
- processed timestamp
- status
- retry count
- payload hash or private payload reference

Raw sensitive payloads should not be copied into public/demo audit tables.

### Identity Map

One internal subject UUID can link to multiple provider IDs.

Example:

```text
subject_uuid
  -> commerce_customer_id
  -> crm_subscriber_id
  -> booking_customer_id
```

Email and phone may be reconciliation signals but should not become the permanent identity key.

### Lifecycle State

Lifecycle state is derived coordination metadata, not source-of-truth replacement data.

A deployment may define states such as:

```text
lead -> prospect -> purchaser -> needs_fulfillment -> booked -> completed -> follow_up
```

State vocabulary is deployment-configurable.

### Workflow Engine

Workflows react to normalized events and verified source facts.

Rules should be deterministic and idempotent wherever possible. Non-idempotent provider mutations require explicit safeguards.

### Reconciliation Engine

Scheduled reconciliation compares systems of record and reports or repairs drift.

Examples:

- paid but absent from CRM
- paid but not booked
- booked but expected payment missing
- CRM lifecycle state inconsistent with booking state
- duplicate provider identities
- failed event processing

### MCP Operator Layer

MCP is an operator interface, not the event transport.

Recommended split:

- broad read-only MCP for inspection and reporting
- narrow admin MCP for approved mutations
- independent authorization and audit for write tools

## Provider adapter contract

Adapters translate provider-specific APIs/webhooks into core contracts.

An adapter may provide:

- webhook verification
- event normalization
- identity lookup
- read operations
- explicitly registered mutations
- provider-specific reconciliation helpers

The core package must not require Square, MailerLite, Trafft, or any single vendor.

## Event processing pattern

```text
receive webhook
  -> authenticate / verify
  -> persist normalized event
  -> acknowledge quickly
  -> process asynchronously
  -> record outcome
  -> retry only according to operation safety
```

Writes that are not safely idempotent must not be blindly retried after ambiguous failures.

## Security principle

Provider credentials remain server-side. Client/operator layers receive only the minimum authorization required for the requested action.

See `SECURITY.md` and `PUBLIC_PRIVATE_BOUNDARY.md`.
