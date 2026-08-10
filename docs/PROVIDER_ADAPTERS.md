# Provider Adapters

Adapters translate vendor-specific webhook/API behavior into the provider-neutral lifecycle model.

## Adapter responsibilities

Each adapter may provide:

- webhook verification
- webhook normalization
- identity extraction
- read capability declarations
- controlled write capability declarations
- reconciliation helpers

The core engine never assumes a specific payment, CRM, or booking vendor.

## Square

The initial Square adapter recognizes payment/order/customer-oriented webhook payloads. Square webhook verification uses HMAC-SHA256 over the exact notification URL concatenated with the raw request body and compares the result with `x-square-hmacsha256-signature`.

Recommended initial subscriptions:

- `payment.updated`
- `order.created`
- `order.updated`
- relevant customer events when customer synchronization is required

Use the upstream `event_id` as the provider event ID whenever present.

## MailerLite

The initial MailerLite adapter supports subscriber lifecycle events and group/automation signals. MailerLite webhooks include a `Signature` header containing an HMAC-SHA256 of the raw JSON payload using the webhook secret.

High-value lifecycle events include:

- `subscriber.created`
- `subscriber.updated`
- `subscriber.unsubscribed`
- `subscriber.added_to_group`
- `subscriber.removed_from_group`
- `subscriber.bounced`
- `subscriber.automation_triggered`
- `subscriber.automation_completed`
- `subscriber.spam_reported`

MailerLite payloads do not need to be treated as a permanent customer identity store. Link the MailerLite subscriber ID to the engine's internal subject ID.

## Trafft

Trafft supports booking lifecycle webhooks including appointment booked, canceled, rescheduled, status changed, and customer created. A Trafft verification token is delivered in the Authorization header.

Because webhook configuration identifies the event trigger, the reference receiver carries the normalized Trafft event name in the registered endpoint URL (for example `event=appointment.booked`).

## Mutation policy

Provider write APIs should be exposed gradually. Recommended order:

1. idempotent or additive CRM/customer synchronization
2. customer update
3. appointment creation
4. appointment cancellation with explicit review
5. only then consider higher-risk administrative changes

Never add delete, refund, bulk pricing, or mass mutation actions merely because the provider API supports them.
