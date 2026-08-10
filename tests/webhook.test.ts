import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { ingestWebhook, verifyHmacSha256 } from '../packages/core/src/webhook.js';

test('HMAC verification is deterministic and rejects changed payloads', () => {
  const secret = 'test-secret';
  const body = '{"event":"subscriber.created"}';
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyHmacSha256(secret, body, signature), true);
  assert.equal(verifyHmacSha256(secret, `${body}x`, signature), false);
});

test('webhook ingestion verifies before normalizing and acknowledges accepted events', async () => {
  const request = {
    method: 'POST',
    headers: { signature: 'ok' },
    rawBody: '{"id":"1"}',
    receivedAt: '2026-08-10T12:00:00.000Z',
  };
  const result = await ingestWebhook(
    request,
    { verify: () => ({ ok: true }) },
    {
      normalize: () => ({
        provider: 'test',
        providerEventId: 'event-1',
        eventType: 'test.created',
        occurredAt: request.receivedAt,
        receivedAt: request.receivedAt,
        payload: { id: '1' },
      }),
    },
  );
  assert.equal(result.status, 202);
  assert.equal(result.accepted, true);
});

test('webhook ingestion rejects oversized payload before verification', async () => {
  const result = await ingestWebhook(
    { method: 'POST', headers: {}, rawBody: '12345' },
    { verify: () => ({ ok: true }) },
    { normalize: () => { throw new Error('should not execute'); } },
    { maxBytes: 4 },
  );
  assert.deepEqual(result, { status: 413, accepted: false, reason: 'payload_too_large' });
});
