# Roadmap

## WP1 — Event Hub & Identity Map

- normalized event envelope
- provider event deduplication
- customer/subject identity map
- provider identity links
- correlation IDs
- lifecycle state foundation

## WP2 — Webhook Intake

- authenticated webhook receiver contract
- provider verification adapters
- async processing pattern
- retry/error states
- dead-letter/review queue

## WP3 — Provider Adapters

Initial proving adapters:

- Square: commerce/orders/payments
- MailerLite: CRM/subscriber lifecycle
- Trafft: booking/customer/appointment lifecycle

Adapters must remain replaceable and must not leak provider-specific assumptions into core modules.

## WP4 — Lifecycle Rules

- deterministic workflow rules
- lifecycle transitions
- idempotent safe actions
- approval boundary for consequential mutations
- configurable deployment mappings

## WP5 — Reconciliation Engine

- cross-provider consistency checks
- paid/not-booked detection
- booked/expected-payment-missing detection
- CRM state drift
- duplicate identity detection
- failed-event reconciliation

## WP6 — MCP Operator Layer

- read-only inspection surface
- controlled admin surface
- authorization model
- tool-level safety annotations
- metadata-only write audit

## WP7 — Operations Audit

One normalized report spanning:

- commerce
- CRM
- booking
- cross-system mismatches
- webhook processing failures
- recent admin writes
- unresolved reconciliation findings

## WP8 — Packaging & Deployment

- reference Supabase deployment
- environment/config templates
- migration packaging
- adapter configuration
- local development setup
- optional container/CLI packaging if justified

## Future / parked

Productization is intentionally not an active workstream. Revisit only after sustained production use and external demand signals.
