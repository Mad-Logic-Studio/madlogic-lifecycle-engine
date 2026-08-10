# Security Policy

## Scope

MadLogic Lifecycle Engine is designed to sit between systems that may contain customer, booking, CRM, and payment-adjacent data. Security defaults must therefore be conservative.

## Core requirements

- keep provider credentials server-side
- verify webhook authenticity before accepting events
- deduplicate provider events
- minimize stored PII
- separate read and write operator surfaces
- require explicit authorization for mutations
- never blindly retry non-idempotent writes
- sanitize upstream errors before returning them to clients
- maintain independent operational/write audit metadata
- use least-privilege database and provider credentials

## MCP guidance

A recommended deployment uses:

- a read-only MCP for inspection
- a separate admin MCP for mutations
- OAuth or equivalent standards-based authentication for the admin resource
- server-side authorization/allowlisting
- explicit tool allowlists
- additional confirmation for consequential non-idempotent operations

MCP clients must never receive upstream provider client secrets.

## Webhook guidance

Webhook endpoints should:

1. verify provider signature/token/authentication
2. enforce request-size bounds
3. persist an immutable normalized event/deduplication record
4. acknowledge quickly
5. perform heavier processing asynchronously

## Audit guidance

Prefer metadata-only operational audit records:

- actor / integration identity
- tool or workflow name
- timestamp
- outcome
- provider HTTP status
- provider resource identifier when appropriate
- normalized error code

Avoid storing names, emails, phone numbers, appointment notes, payment details, or entire request bodies in generic audit logs.

## Secrets

Never commit real secrets. Public examples must use placeholders only.

Report suspected security issues privately to the repository maintainers rather than posting credentials or exploit details in a public issue.
