import test from 'node:test';
import assert from 'node:assert/strict';
import { findOfferBinding, validateLifecycleConfig } from '../packages/core/src/config.js';

test('configuration validates provider uniqueness and booking references', () => {
  const valid = validateLifecycleConfig({
    providers: [
      { provider: 'square', role: 'commerce', enabled: true },
      { provider: 'mailerlite', role: 'crm', enabled: true },
      { provider: 'trafft', role: 'booking', enabled: true },
    ],
    offers: [
      { key: 'example-offer', commerceProductRef: 'product_example', bookingServiceRef: 'service_example', requiresPayment: true, requiresBooking: true },
    ],
  });
  assert.equal(valid.ok, true);

  const invalid = validateLifecycleConfig({
    providers: [
      { provider: 'square', role: 'commerce', enabled: true },
      { provider: 'square', role: 'commerce', enabled: true },
    ],
    offers: [{ key: 'broken', requiresBooking: true }],
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes('duplicate_provider:square'));
  assert.ok(invalid.errors.includes('booking_service_required:broken'));
});

test('offer lookup resolves commerce product reference', () => {
  const config = {
    providers: [{ provider: 'square', role: 'commerce' as const, enabled: true }],
    offers: [{ key: 'example', commerceProductRef: 'product_123' }],
  };
  assert.equal(findOfferBinding(config, 'product_123')?.key, 'example');
});
