import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionEventStatus } from '../packages/core/src/event-processing.js';
import { canTransitionLifecycleStage } from '../packages/core/src/lifecycle-state.js';

test('event status transitions allow processing flow and controlled retry', () => {
  assert.equal(canTransitionEventStatus('received', 'processing'), true);
  assert.equal(canTransitionEventStatus('processing', 'processed'), true);
  assert.equal(canTransitionEventStatus('failed', 'processing'), true);
  assert.equal(canTransitionEventStatus('processed', 'processing'), false);
});

test('lifecycle transitions allow normal forward flow and block invalid regression', () => {
  assert.equal(canTransitionLifecycleStage('lead', 'prospect'), true);
  assert.equal(canTransitionLifecycleStage('prospect', 'purchaser'), true);
  assert.equal(canTransitionLifecycleStage('purchaser', 'needs_fulfillment'), true);
  assert.equal(canTransitionLifecycleStage('needs_fulfillment', 'booked'), true);
  assert.equal(canTransitionLifecycleStage('booked', 'completed'), true);
  assert.equal(canTransitionLifecycleStage('completed', 'lead'), false);
});
