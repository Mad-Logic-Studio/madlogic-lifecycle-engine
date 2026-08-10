# Generic Service Business Example

This example demonstrates a common lifecycle without embedding any real business identifiers.

```text
prospect -> purchaser -> needs_fulfillment -> booked -> completed -> follow_up
```

The example assumes:

- Square is the commerce system of record
- MailerLite is the CRM/email lifecycle system of record
- Trafft is the booking system of record

The engine does not replace any of them. It links provider identities, normalizes events, checks expected state, and exposes safe repairs or review-required exceptions.

## Example expectations

For `example-service`:

1. completed payment means the subject should exist in the CRM;
2. the purchaser should belong to the configured purchaser group;
3. the offer requires a booking;
4. if a booking exists but expected payment is absent, raise a critical review finding;
5. if CRM state drifts, an idempotent CRM repair may be eligible for automatic execution.

All IDs in `lifecycle.config.example.json` are placeholders.
