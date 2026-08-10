# MadLogic Lifecycle Engine

Event-driven customer lifecycle orchestration with identity mapping, reconciliation, webhooks, MCP operator surfaces, and pluggable commerce, CRM, and booking adapters.

> **Status:** Foundation design in progress. This project is intentionally built with a strict public/private boundary so reusable infrastructure can remain public while tenant-specific business configuration, credentials, identifiers, and customer data remain private.

## What problem does this solve?

Small businesses often spread one customer journey across several systems:

- a commerce platform knows what was purchased and paid
- a CRM knows subscriber state, segmentation, and follow-up
- a booking platform knows appointments and service delivery
- none of them necessarily knows whether the **whole lifecycle** is correct

The Lifecycle Engine provides a neutral coordination layer that can answer questions such as:

- Who paid but has not booked?
- Who booked but is missing the expected payment?
- Which purchaser is still in a prospect-only CRM group?
- Which provider records belong to the same real customer?
- Which webhook failed, and did reconciliation repair the drift?

## Core design principle

> **Use webhooks for events. Use APIs for actions. Use reconciliation for correctness. Use MCP for governed operator intent. Keep systems of record authoritative.**

## Architecture

```text
Commerce events -----\
CRM events -----------> Event Hub -> Identity Map -> Workflow / Reconciliation -> Provider adapters
Booking events -------/                    |                       |
                                           |                       +-> governed API actions
                                           +-> lifecycle state

Operator / AI -> MCP Reader / Admin -> same governed services and audit layer
```

## Foundation components

- **Event Ledger** — normalized, deduplicated provider events
- **Customer Identity Map** — links provider-specific IDs to one internal subject identity
- **Lifecycle State** — explicit customer journey state without replacing source systems
- **Workflow Engine** — deterministic rules for safe cross-system actions
- **Reconciliation Engine** — scheduled repair/detection when systems drift
- **Provider Adapters** — replaceable commerce, CRM, and booking connectors
- **MCP Operator Layer** — read/admin surfaces with explicit authorization boundaries
- **Audit** — metadata-first operational and write history

## Initial adapters

The first proving stack uses public adapters for:

- Square — commerce / orders / payments
- MailerLite — CRM / subscriber lifecycle
- Trafft — booking / customer / appointment lifecycle

These are adapters, **not hard dependencies of the core engine**. Future adapters can target other providers without rewriting identity, events, reconciliation, or audit logic.

## Public/private boundary

This repository must never contain real customer data, API credentials, production webhook secrets, private deployment URLs, tenant IDs, production provider IDs, private pricing rules, or company-specific lifecycle mappings.

See [`PUBLIC_PRIVATE_BOUNDARY.md`](PUBLIC_PRIVATE_BOUNDARY.md).

## Development model

Development proceeds through branches and reviewed pull requests. The initial work packages are tracked as GitHub issues and summarized in [`ROADMAP.md`](ROADMAP.md).

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`ROADMAP.md`](ROADMAP.md)
- [`SECURITY.md`](SECURITY.md)
- [`PUBLIC_PRIVATE_BOUNDARY.md`](PUBLIC_PRIVATE_BOUNDARY.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/WIKI_PLAN.md`](docs/WIKI_PLAN.md)

## License

MIT. See [`LICENSE`](LICENSE).
