# MadLogic Lifecycle Engine Roadmap

## WP1 — Event Hub & Customer Identity Map — IN PROGRESS

Current implementation on `foundation/lifecycle-engine-v1` includes:

- provider-neutral lifecycle event contract
- deterministic provider-event deduplication
- correlation IDs
- internal subject identity model
- provider identity linking
- normalized email/phone helpers
- Supabase reference migration
- deterministic unit tests
- CI build/test gate

Remaining before WP1 is complete:

- review CI results and resolve any build/test issues
- add Postgres-level migration verification
- define lifecycle-state persistence separately from provider identity
- add event processing transition helpers (`received -> processing -> processed/failed/dead_letter`)

## WP2 — Authenticated Webhook Intake & Event Processing

- provider verification interface
- bounded request handling
- normalized event persistence
- fast acknowledgement pattern
- asynchronous processing
- retry/error/dead-letter states
- idempotency and replay safety

## WP3 — Provider Adapters

Initial adapters:

- Square — commerce/orders/payments/customer references
- MailerLite — CRM/subscribers/groups/automation lifecycle
- Trafft — booking/customers/services/appointments

Adapters remain replaceable; the core must not depend on vendor-specific models.

## WP4 — Lifecycle Rules & Governed Actions

- lifecycle state transitions
- configuration-driven workflow rules
- safe idempotent actions
- explicit review/confirmation boundary for consequential writes

## WP5 — Cross-System Reconciliation

Detect and classify drift such as:

- paid but not booked
- booked but expected payment missing
- purchaser missing from CRM
- stale CRM lifecycle state
- duplicate provider identities
- failed event processing

## WP6 — MCP Operator Layer

- broad read-only inspection MCP
- narrow admin mutation MCP
- standards-based authentication and server-side authorization
- metadata-only operational/write audit

## WP7 — Unified Operations Audit

Produce one normalized report spanning commerce, CRM, booking, event failures, reconciliation findings, and recent admin writes while minimizing PII.

## WP8 — Packaging & Reference Deployment

- reference Supabase deployment
- migrations and environment templates
- CI/test gates
- optional container/CLI packaging if justified
- generic service-business example

## Future — Productization

Tracked as a parking-lot GitHub issue only. Productization must not delay the production proving work.
