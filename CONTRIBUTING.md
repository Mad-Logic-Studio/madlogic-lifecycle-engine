# Contributing

Thank you for helping improve MadLogic Lifecycle Engine.

## Before opening a pull request

- keep reusable logic vendor-neutral where possible
- isolate provider-specific behavior inside adapters
- use synthetic fixtures only
- do not include real customer or tenant data
- do not commit credentials or private deployment identifiers
- include or update tests for behavioral changes
- document new public contracts

## Branching

Use focused branches and pull requests. Avoid unrelated refactors in the same change set.

## Provider adapters

A provider adapter should clearly separate:

- webhook verification
- event normalization
- reads
- mutations
- reconciliation helpers

Mutation support must document idempotency/retry behavior and any destructive consequences.

## Security review

Changes involving authentication, authorization, secrets, webhook verification, mutations, PII handling, or MCP admin tools require explicit security review before merge.

## Public/private boundary

Read `PUBLIC_PRIVATE_BOUNDARY.md` before contributing. If a proposed change depends on private production data or business-specific mappings, generalize it before submitting publicly.
