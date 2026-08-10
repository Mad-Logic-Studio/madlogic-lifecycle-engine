# Public / Private Boundary

This repository is public by design. Treat that as a security boundary, not merely a documentation preference.

## Allowed in this repository

- provider-neutral architecture
- reusable source code
- public API contracts
- generic database schemas and migrations
- placeholder configuration
- synthetic fixtures
- adapter interfaces
- security patterns
- deterministic tests
- examples using fake tenants and fake customers

## Never commit here

- API keys, access tokens, refresh tokens, client secrets, webhook secrets
- real customer names, email addresses, phone numbers, appointment notes, payment data
- production database/project references when they identify private infrastructure
- hosted capability URLs or private MCP URLs
- OAuth client secrets or private authorization configuration
- production provider customer/order/subscriber/service IDs
- company-specific offer mappings, pricing rules, fulfillment rules, internal campaign strategy
- raw production webhook payloads
- screenshots or logs containing PII

## Placeholder standard

Use values such as:

```text
customer_123
subscriber_123
order_123
service_123
project_ref
https://tenant.example
person@example.invalid
TOKEN=replace_me
```

## Downstream deployments

A real business deployment should consume the public engine from a private repository or private deployment configuration.

Private deployment code may contain provider mappings and tenant-specific lifecycle rules, but credentials should still live in an approved secret store rather than source control.

## Promotion rule

When a useful capability is discovered in a private deployment:

1. determine whether it is genuinely reusable
2. remove all tenant/customer/business-specific details
3. replace identifiers and fixtures with synthetic values
4. verify no secret or capability URL is present
5. add tests independent of the private deployment
6. promote through a public pull request

When in doubt, keep it private until reviewed.
