import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestEvent, type EventLedgerStore } from '../packages/core/src/event-ledger.js';
import type { LifecycleEvent } from '../packages/core/src/types.js';

class MemoryEventStore implements EventLedgerStore {
  keys = new Set<string>();
  events: LifecycleEvent[] = [];

  async hasDedupeKey(key: string): Promise<boolean> {
    return this.keys.has(key);
  }

  async insert<TPayload>(event: LifecycleEvent<TPayload>, dedupeKey: string): Promise<void> {
    this.keys.add(dedupeKey);
    this.events.push(event as LifecycleEvent);
  }
}

test('ingestEvent accepts a new provider event exactly once', async () => {
  const store = new MemoryEventStore();
  const input = {
    eventId: 'event_1',
    provider: 'example-payments',
    eventType: 'order.paid',
    providerEventId: 'provider_event_1',
    occurredAt: '2026-08-10T00:00:00.000Z',
    receivedAt: '2026-08-10T00:00:01.000Z',
    payload: { orderId: 'order_123' },
  };

  const first = await ingestEvent(store, input);
  const second = await ingestEvent(store, input);

  assert.equal(first.accepted, true);
  assert.equal(first.duplicate, false);
  assert.equal(second.accepted, false);
  assert.equal(second.duplicate, true);
  assert.equal(store.events.length, 1);
  assert.equal(store.events[0].status, 'received');
  assert.equal(store.events[0].correlationId, 'example-payments:provider_event_1');
});
