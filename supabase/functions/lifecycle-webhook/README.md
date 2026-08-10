# Lifecycle Webhook Edge Function

Reference Supabase Edge Function for authenticated webhook intake.

## Routes

Deploy the function with JWT verification disabled because external providers do not send Supabase JWTs. The function performs provider-specific verification itself.

Use one deployed function URL with query parameters:

- `?provider=square`
- `?provider=mailerlite`
- `?provider=trafft&event=appointment.booked`

For Trafft, create one URL per event type so the receiver can attach a deterministic normalized event name.

## Required runtime secrets

Set these through your deployment secret manager; never commit them:

- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `SQUARE_WEBHOOK_NOTIFICATION_URL`
- `MAILERLITE_WEBHOOK_SECRET`
- `TRAFFT_WEBHOOK_VERIFICATION_TOKEN`

The standard Supabase runtime variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also required.

## Safety properties

- POST only for event delivery
- 1 MiB body limit
- provider-specific signature/token validation before persistence
- deterministic provider event IDs when the upstream payload has no event ID
- atomic database deduplication through `lifecycle_ingest_webhook`
- no provider credentials returned in responses
- invalid signatures fail closed

The GET health response reports only whether each provider verification configuration is present, never the secret value.
