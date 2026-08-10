import test from 'node:test';
import assert from 'node:assert/strict';
import { planWorkflow, requireConfirmation } from '../packages/core/src/workflow.js';
import type { LifecycleEvent } from '../packages/core/src/types.js';

const event: LifecycleEvent = {
  eventId: 'evt-1',
  provider: 'square',
  eventType: 'payment.updated',
  providerEventId: 'sq-1',
  occurredAt: '2026-08-10T12:00:00Z',
  receivedAt: '2026-08-10T12:00:01Z',
  correlationId: 'corr-1',
  status: 'received',
  payload: {},
};

test('workflow planner separates low-risk automatic work from review-required actions', () => {
  const plan = planWorkflow(event, {}, [
    {
      id: 'paid-flow',
      matches: (candidate) => candidate.eventType === 'payment.updated',
      plan: () => [
        { id: 'crm-upsert', kind: 'crm.upsert', risk: 'low', idempotencyKey: 'crm:1', input: {} },
        { id: 'refund', kind: 'commerce.refund', risk: 'important', input: {} },
      ],
    },
  ]);

  assert.deepEqual(plan.matchedRuleIds, ['paid-flow']);
  assert.equal(plan.automatic.length, 1);
  assert.equal(plan.reviewRequired.length, 1);
  assert.equal(requireConfirmation(plan.reviewRequired[0]!), true);
});

test('workflow planner deduplicates actions by idempotency key', () => {
  const action = { id: 'same', kind: 'crm.assign', risk: 'low' as const, idempotencyKey: 'group:1', input: {} };
  const plan = planWorkflow(event, {}, [
    { id: 'a', matches: () => true, plan: () => [action] },
    { id: 'b', matches: () => true, plan: () => [action] },
  ]);
  assert.equal(plan.automatic.length, 1);
});
