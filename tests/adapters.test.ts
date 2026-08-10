import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createSquareAdapter } from '../adapters/square/index.js';
import { createMailerLiteAdapter } from '../adapters/mailerlite/index.js';
import { createTrafftAdapter } from '../adapters/trafft/index.js';

const receivedAt = '2026-08-10T12:00:00.000Z';

test('Square adapter verifies official URL+body HMAC shape and normalizes event id', async () => {
  const body = JSON.stringify({ event_id: 'sq-event-1', type: 'payment.updated', created_at: receivedAt, data: { object: { payment: { customer_id: 'cust-1' } } } });
  const signatureKey = 'square-secret';
  const notificationUrl = 'https://example.invalid/webhooks/square';
  const signature = createHmac('sha256', signatureKey).update(`${notificationUrl}${body}`).digest('base64');
  const adapter = createSquareAdapter({ signatureKey, notificationUrl });
  assert.deepEqual(await adapter.verifier?.verify({ method: 'POST', headers: { 'x-square-hmacsha256-signature': signature }, rawBody: body, receivedAt }), { ok: true });
  const event = adapter.normalizer?.normalize({ method: 'POST', headers: {}, rawBody: body, receivedAt });
  assert.equal(event?.providerEventId, 'sq-event-1');
  assert.equal(event?.eventType, 'payment.updated');
});

test('MailerLite adapter verifies Signature HMAC and derives subscriber identity', async () => {
  const body = JSON.stringify({ id: 'ml-1', email: 'person@example.invalid', event: 'subscriber.created', created_at: receivedAt, fields: { phone: '+15555550100' } });
  const secret = 'mailer-secret';
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  const adapter = createMailerLiteAdapter({ webhookSecret: secret });
  assert.deepEqual(await adapter.verifier?.verify({ method: 'POST', headers: { signature }, rawBody: body, receivedAt }), { ok: true });
  const ingested = adapter.normalizer!.normalize({ method: 'POST', headers: {}, rawBody: body, receivedAt });
  const identity = adapter.identityFromEvent?.({
    eventId: 'event-1', provider: 'mailerlite', eventType: ingested.eventType,
    providerEventId: ingested.providerEventId, occurredAt: ingested.occurredAt,
    receivedAt: ingested.receivedAt, correlationId: 'corr-1', status: 'received', payload: ingested.payload,
  });
  assert.equal(identity?.providerIdentityId, 'ml-1');
  assert.equal(identity?.email, 'person@example.invalid');
});

test('Trafft adapter accepts configured verification token and deterministic event type', async () => {
  const body = JSON.stringify({ customer_id: 42, customer_email: 'person@example.invalid', appointment_id: 91 });
  const adapter = createTrafftAdapter({ verificationToken: 'trafft-token', eventType: 'appointment.booked' });
  assert.deepEqual(await adapter.verifier?.verify({ method: 'POST', headers: { authorization: 'Bearer trafft-token' }, rawBody: body, receivedAt }), { ok: true });
  const event = adapter.normalizer?.normalize({ method: 'POST', headers: {}, rawBody: body, receivedAt });
  assert.equal(event?.eventType, 'appointment.booked');
});
